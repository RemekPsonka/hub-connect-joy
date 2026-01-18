import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user is a superadmin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Nieprawidłowy token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: superadmin, error: superadminError } = await supabaseAdmin
      .from('superadmins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (superadminError || !superadmin) {
      return new Response(JSON.stringify({ error: 'Brak uprawnień superadmina' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tenantId } = await req.json();
    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Brak ID organizacji' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting deletion of tenant: ${tenantId}`);

    // Get all user_ids from directors and assistants for this tenant (to delete from auth.users later)
    const { data: directors } = await supabaseAdmin
      .from('directors')
      .select('user_id')
      .eq('tenant_id', tenantId);

    const { data: assistants } = await supabaseAdmin
      .from('assistants')
      .select('user_id')
      .eq('tenant_id', tenantId);

    const userIds = [
      ...(directors?.map(d => d.user_id) || []),
      ...(assistants?.map(a => a.user_id) || []),
    ];

    // Delete in order respecting foreign key constraints
    // Phase 1: Delete deepest dependencies first
    const deletionOrder = [
      // BI and agent data
      'bi_interview_sessions', // depends on contact_bi_data
      'contact_bi_history', // depends on contact_bi_data
      'contact_bi_data',
      'agent_conversations',
      'contact_agent_memory',
      
      // Consultation related
      'consultation_chat_messages',
      'consultation_guests',
      'consultation_meetings',
      'consultation_recommendations',
      'consultation_thanks',
      'consultation_questionnaire',
      'consultations',
      
      // Meeting related
      'meeting_recommendations',
      'one_on_one_meetings',
      'meeting_participants',
      'group_meetings',
      
      // Matches and needs/offers
      'daily_serendipity',
      'matches',
      'needs',
      'offers',
      
      // Tasks
      'cross_tasks',
      'tasks',
      
      // Connections
      'connections',
      
      // Notifications
      'notifications',
      'notification_preferences',
      
      // AI related
      'ai_recommendation_actions',
      'master_agent_queries',
      'master_agent_memory',
      
      // Contact related
      'contact_merge_history',
      
      // Groups and positions
      'assistant_group_access',
      'contact_groups',
      'default_positions',
      
      // Contacts and companies (contacts before companies due to company_id FK)
      'contacts',
      'companies',
      
      // Users
      'assistants',
      'directors',
      
      // User roles
      'user_roles',
    ];

    for (const table of deletionOrder) {
      console.log(`Deleting from ${table}...`);
      
      // Some tables use tenant_id, some don't - handle accordingly
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('tenant_id', tenantId);
      
      if (error) {
        // If table doesn't have tenant_id, it might fail - that's ok for some tables
        console.log(`Note: ${table} deletion result: ${error?.message || 'success'}`);
      }
    }

    // Delete from tenants table
    console.log('Deleting tenant record...');
    const { error: tenantError } = await supabaseAdmin
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (tenantError) {
      console.error('Error deleting tenant:', tenantError);
      return new Response(JSON.stringify({ 
        error: `Nie można usunąć organizacji: ${tenantError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete users from auth.users
    console.log(`Deleting ${userIds.length} users from auth...`);
    for (const userId of userIds) {
      try {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          console.log(`Warning: Could not delete auth user ${userId}: ${authError.message}`);
        }
      } catch (e) {
        console.log(`Warning: Error deleting auth user ${userId}:`, e);
      }
    }

    console.log(`Successfully deleted tenant: ${tenantId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in delete-tenant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
