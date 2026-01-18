import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create user client for authorization check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Nie można zweryfikować użytkownika' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, fullName, groupIds, directorId, tenantId } = await req.json();

    if (!email || !fullName || !directorId || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'Brakujące dane: email, fullName, directorId lub tenantId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!groupIds || groupIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Musisz wybrać co najmniej jedną grupę kontaktów' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating assistant: ${email} for director ${directorId} in tenant ${tenantId}`);

    // Check if requester is the director or admin
    const { data: director, error: directorError } = await supabaseAdmin
      .from('directors')
      .select('id, user_id, tenant_id')
      .eq('id', directorId)
      .single();

    if (directorError || !director) {
      console.error('Director not found:', directorError);
      return new Response(
        JSON.stringify({ error: 'Dyrektor nie znaleziony' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions - must be the director themselves or a tenant admin
    const isDirector = director.user_id === user.id;
    const { data: isAdmin } = await supabaseAdmin.rpc('is_tenant_admin', {
      _user_id: user.id,
      _tenant_id: tenantId
    });

    if (!isDirector && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Brak uprawnień do tworzenia asystentów' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary password
    const tempPassword = generatePassword();

    // Create user in auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        is_assistant: true,
        director_id: directorId,
        tenant_id: tenantId,
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: `Błąd tworzenia użytkownika: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auth user created: ${newUser.user.id}`);

    // Create assistant entry
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .insert({
        user_id: newUser.user.id,
        director_id: directorId,
        tenant_id: tenantId,
        email,
        full_name: fullName,
      })
      .select()
      .single();

    if (assistantError) {
      console.error('Error creating assistant:', assistantError);
      // Clean up user if assistant creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Błąd tworzenia asystenta: ${assistantError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Assistant created: ${assistant.id}`);

    // Create group access entries
    const groupAccessEntries = groupIds.map((groupId: string) => ({
      assistant_id: assistant.id,
      group_id: groupId,
    }));

    const { error: groupError } = await supabaseAdmin
      .from('assistant_group_access')
      .insert(groupAccessEntries);

    if (groupError) {
      console.error('Error creating group access:', groupError);
      // Clean up
      await supabaseAdmin.from('assistants').delete().eq('id', assistant.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Błąd przypisywania grup: ${groupError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Assistant ${email} created successfully with ${groupIds.length} groups`);

    return new Response(
      JSON.stringify({
        success: true,
        assistant: {
          id: assistant.id,
          email,
          fullName,
          groupIds,
        },
        tempPassword
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: `Błąd serwera: ${message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const specialChars = '!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  for (let i = 0; i < 2; i++) {
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
