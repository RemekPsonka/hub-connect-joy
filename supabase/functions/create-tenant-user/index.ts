import { z } from "zod";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Zod schema for request validation
const requestSchema = z.object({
  email: z.string().email("Nieprawidlowy email"),
  fullName: z.string().min(2, "Imie min. 2 znaki").max(100, "Imie max 100 znakow"),
  role: z.enum(["director", "assistant"], { 
    errorMap: () => ({ message: "Rola musi byc director lub assistant" }) 
  }),
  tenantId: z.string().uuid("tenantId musi byc poprawnym UUID"),
});

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

    // Validate request body with Zod
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName, role, tenantId } = validation.data;

    console.log(`Creating user: ${email} with role ${role} for tenant ${tenantId}`);

    // Check if requester is tenant admin
    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('is_tenant_admin', {
      _user_id: user.id,
      _tenant_id: tenantId
    });

    if (adminError || !isAdmin) {
      console.error('Not admin:', adminError);
      return new Response(
        JSON.stringify({ error: 'Brak uprawnień do dodawania użytkowników' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary password
    const tempPassword = generatePassword();

    // Create user in auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        invited_to_tenant: tenantId,
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: `Błąd tworzenia użytkownika: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User created: ${newUser.user.id}`);

    // Create director entry (trigger won't fire for invited users)
    const { error: directorError } = await supabaseAdmin
      .from('directors')
      .insert({
        user_id: newUser.user.id,
        tenant_id: tenantId,
        email,
        full_name: fullName,
        role: role // Legacy role field
      });

    if (directorError) {
      console.error('Error creating director:', directorError);
      // Clean up user if director creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Błąd tworzenia profilu: ${directorError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user_roles entry
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        tenant_id: tenantId,
        role: role
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
    }

    console.log(`User ${email} created successfully with role ${role}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email,
          fullName,
          role
        },
        tempPassword // Return password so admin can share it
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
  
  // 8 alphanumeric chars
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Add 2 special chars
  for (let i = 0; i < 2; i++) {
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
