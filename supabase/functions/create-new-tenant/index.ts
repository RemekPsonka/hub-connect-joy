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
    
    // Client with user's JWT for authorization check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is a superadmin
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Błąd autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is superadmin using service client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: superadmin, error: superadminError } = await adminClient
      .from('superadmins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (superadminError || !superadmin) {
      console.error('Superadmin check failed:', superadminError);
      return new Response(
        JSON.stringify({ error: 'Brak uprawnień superadmina' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { tenantName, ownerEmail, ownerPassword, ownerFullName } = await req.json();

    if (!tenantName || !ownerEmail || !ownerPassword || !ownerFullName) {
      return new Response(
        JSON.stringify({ error: 'Wymagane pola: tenantName, ownerEmail, ownerPassword, ownerFullName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating new tenant:', tenantName, 'with owner:', ownerEmail);

    // 1. Create the tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({ name: tenantName })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Błąd tworzenia organizacji: ' + tenantError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tenant created:', tenant.id);

    // 2. Create the user in auth.users
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { full_name: ownerFullName }
    });

    if (authError) {
      console.error('User creation error:', authError);
      // Rollback: delete tenant
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Błąd tworzenia użytkownika: ' + authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth user created:', authData.user.id);

    // 3. Create director entry
    const { error: directorError } = await adminClient
      .from('directors')
      .insert({
        user_id: authData.user.id,
        tenant_id: tenant.id,
        email: ownerEmail,
        full_name: ownerFullName,
        role: 'owner'
      });

    if (directorError) {
      console.error('Director creation error:', directorError);
      // Rollback
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Błąd tworzenia dyrektora: ' + directorError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Create user_roles entry with owner role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        tenant_id: tenant.id,
        role: 'owner'
      });

    if (roleError) {
      console.error('Role creation error:', roleError);
      // Continue anyway - not critical
    }

    console.log('Tenant and owner created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name
        },
        owner: {
          id: authData.user.id,
          email: ownerEmail,
          fullName: ownerFullName
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
    return new Response(
      JSON.stringify({ error: 'Nieoczekiwany błąd: ' + errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
