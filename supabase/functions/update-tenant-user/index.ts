import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const updateUserSchema = z.object({
  userId: z.string().uuid("userId musi być poprawnym UUID"),
  tenantId: z.string().uuid("tenantId musi być poprawnym UUID"),
  email: z.string().email("Nieprawidłowy email").max(320).optional(),
  fullName: z.string().min(1).max(200).optional(),
  password: z.string().min(12, "Hasło musi mieć min. 12 znaków").max(128).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the requesting user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowy token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.json();
    const validation = updateUserSchema.safeParse(rawBody);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowe dane wejściowe', details: validation.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, email, fullName, password, tenantId } = validation.data;
    
    console.log('Update user request:', { userId, email, fullName, hasPassword: !!password, tenantId, requestingUserId: requestingUser.id });

    // Check if requesting user is admin/owner OR is editing themselves
    const isSelf = requestingUser.id === userId;
    
    let isAdmin = false;
    if (!isSelf) {
      const { data: adminCheck } = await supabaseAdmin.rpc('is_tenant_admin', {
        _user_id: requestingUser.id,
        _tenant_id: tenantId
      });
      isAdmin = adminCheck === true;
    }

    if (!isSelf && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Brak uprawnień do edycji tego użytkownika' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the target user belongs to the same tenant
    const { data: targetDirector, error: directorError } = await supabaseAdmin
      .from('directors')
      .select('id, user_id, tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (directorError || !targetDirector) {
      console.error('Director not found:', directorError);
      return new Response(
        JSON.stringify({ error: 'Użytkownik nie należy do tego tenanta' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update auth.users if email or password changed
    const authUpdateData: { email?: string; password?: string } = {};
    if (email) authUpdateData.email = email;
    if (password) authUpdateData.password = password;

    if (Object.keys(authUpdateData).length > 0) {
      console.log('Updating auth.users:', { userId, hasEmail: !!email, hasPassword: !!password });
      
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        authUpdateData
      );

      if (authUpdateError) {
        console.error('Auth update error:', authUpdateError);
        return new Response(
          JSON.stringify({ error: `Błąd aktualizacji danych logowania: ${authUpdateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update directors table if email or fullName changed
    const directorUpdateData: { email?: string; full_name?: string } = {};
    if (email) directorUpdateData.email = email;
    if (fullName) directorUpdateData.full_name = fullName;

    if (Object.keys(directorUpdateData).length > 0) {
      console.log('Updating directors:', { userId, tenantId, ...directorUpdateData });
      
      const { error: directorUpdateError } = await supabaseAdmin
        .from('directors')
        .update(directorUpdateData)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (directorUpdateError) {
        console.error('Director update error:', directorUpdateError);
        return new Response(
          JSON.stringify({ error: `Błąd aktualizacji danych: ${directorUpdateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('User updated successfully:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Dane użytkownika zaktualizowane' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Wystąpił nieoczekiwany błąd' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
