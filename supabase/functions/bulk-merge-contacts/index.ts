import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkMergeRequest {
  primaryContactId: string;
  secondaryContactId: string;
  mergedFields: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }
    const { tenantId } = authResult;

    const { primaryContactId, secondaryContactId, mergedFields } = await req.json() as BulkMergeRequest;

    if (!primaryContactId || !secondaryContactId) {
      return new Response(JSON.stringify({ error: 'Both primaryContactId and secondaryContactId are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify both contacts belong to this tenant
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('id, full_name, tenant_id')
      .in('id', [primaryContactId, secondaryContactId])
      .eq('tenant_id', tenantId);

    if (fetchError || !contacts || contacts.length !== 2) {
      return new Response(JSON.stringify({ error: 'One or both contacts not found or not accessible' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const secondaryName = contacts.find(c => c.id === secondaryContactId)?.full_name || 'Unknown';

    console.log(`Bulk merging contacts: primary=${primaryContactId}, secondary=${secondaryContactId}, tenant=${tenantId}`);

    // 1. Update primary contact with merged fields
    const allowedFields = [
      'full_name', 'first_name', 'last_name', 'email', 'email_secondary',
      'phone', 'phone_business', 'company', 'company_id', 'position',
      'city', 'linkedin_url', 'source', 'address', 'address_secondary',
      'notes', 'profile_summary', 'primary_group_id', 'relationship_strength',
      'tags', 'title', 'met_date', 'met_source'
    ];

    const sanitizedFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(mergedFields)) {
      if (allowedFields.includes(key)) {
        sanitizedFields[key] = value;
      }
    }

    sanitizedFields.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('contacts')
      .update(sanitizedFields)
      .eq('id', primaryContactId);

    if (updateError) throw updateError;

    // 2. Transfer related records from secondary to primary
    const transferTables = [
      { table: 'needs', column: 'contact_id' },
      { table: 'offers', column: 'contact_id' },
      { table: 'task_contacts', column: 'contact_id' },
      { table: 'consultations', column: 'contact_id' },
      { table: 'contact_activity_log', column: 'contact_id' },
    ];

    for (const { table, column } of transferTables) {
      const { error } = await supabase
        .from(table)
        .update({ [column]: primaryContactId })
        .eq(column, secondaryContactId);

      if (error) {
        console.error(`Error transferring ${table}:`, error);
      }
    }

    // 3. Also transfer consultation_guests, consultation_meetings, consultation_recommendations, consultation_thanks
    const additionalTables = [
      'consultation_guests',
      'consultation_meetings', 
      'consultation_recommendations',
      'consultation_thanks',
      'agent_conversations',
    ];

    for (const table of additionalTables) {
      const { error } = await supabase
        .from(table)
        .update({ contact_id: primaryContactId })
        .eq('contact_id', secondaryContactId);

      if (error) {
        console.error(`Error transferring ${table}:`, error);
      }
    }

    // 4. Transfer connections
    const { error: connAError } = await supabase
      .from('connections')
      .update({ contact_a_id: primaryContactId })
      .eq('contact_a_id', secondaryContactId);
    if (connAError) console.error('Error transferring connections (a):', connAError);

    const { error: connBError } = await supabase
      .from('connections')
      .update({ contact_b_id: primaryContactId })
      .eq('contact_b_id', secondaryContactId);
    if (connBError) console.error('Error transferring connections (b):', connBError);

    // 5. Soft-delete secondary contact
    const { error: deleteError } = await supabase
      .from('contacts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', secondaryContactId);

    if (deleteError) throw deleteError;

    // 6. Log merge in contact_merge_history
    await supabase.from('contact_merge_history').insert({
      tenant_id: tenantId,
      primary_contact_id: primaryContactId,
      merged_contact_data: { secondary_contact_id: secondaryContactId, merged_fields: sanitizedFields },
      merge_source: 'bulk_merge',
    });

    // 7. Log activity
    await supabase.from('contact_activity_log').insert({
      tenant_id: tenantId,
      contact_id: primaryContactId,
      activity_type: 'bulk_merged',
      description: `Kontakt scalony z: ${secondaryName}. Powiązane rekordy przeniesione.`,
      metadata: {
        secondary_contact_id: secondaryContactId,
        secondary_contact_name: secondaryName,
        fields_updated: Object.keys(sanitizedFields).filter(k => k !== 'updated_at'),
      },
    });

    return new Response(
      JSON.stringify({ success: true, primaryContactId, secondaryContactId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
