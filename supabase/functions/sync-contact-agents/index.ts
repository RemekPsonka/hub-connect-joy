import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============= AUTHORIZATION CHECK =============
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }
    const { tenantId } = authResult;
    // ============= END AUTHORIZATION CHECK =============

    console.log(`[sync-contact-agents] Starting sync for tenant ${tenantId}`);

    // Get contacts that have profile_summary but no agent memory entry
    const { data: contactsWithProfile } = await supabase
      .from('contacts')
      .select('id, full_name, company, position, profile_summary, tags')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .not('profile_summary', 'is', null);

    // Get existing agent memory entries
    const { data: existingAgents } = await supabase
      .from('contact_agent_memory')
      .select('contact_id')
      .eq('tenant_id', tenantId);

    const existingContactIds = new Set((existingAgents || []).map(a => a.contact_id));

    // Filter contacts that need agent creation
    const contactsNeedingAgents = (contactsWithProfile || []).filter(
      c => !existingContactIds.has(c.id) && c.profile_summary && c.profile_summary.length > 50
    );

    console.log(`[sync-contact-agents] Found ${contactsNeedingAgents.length} contacts needing agent creation`);

    let created = 0;
    let errors = 0;

    // Create agent memory entries for contacts without them
    for (const contact of contactsNeedingAgents) {
      try {
        const { error } = await supabase
          .from('contact_agent_memory')
          .insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            agent_persona: `Agent AI reprezentujący ${contact.full_name}${contact.company ? ` z firmy ${contact.company}` : ''}${contact.position ? `, ${contact.position}` : ''}`,
            agent_profile: {
              summary: contact.profile_summary?.substring(0, 500) || '',
              auto_generated: true,
              created_from: 'sync-contact-agents'
            },
            insights: {
              topics: contact.tags || [],
              last_sync: new Date().toISOString()
            }
          });

        if (error) {
          console.error(`[sync-contact-agents] Error creating agent for ${contact.full_name}:`, error);
          errors++;
        } else {
          created++;
        }
      } catch (err) {
        console.error(`[sync-contact-agents] Exception for ${contact.full_name}:`, err);
        errors++;
      }
    }

    console.log(`[sync-contact-agents] Completed: created ${created}, errors ${errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_contacts_with_profile: contactsWithProfile?.length || 0,
        existing_agents: existingAgents?.length || 0,
        agents_created: created,
        errors: errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-contact-agents] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
