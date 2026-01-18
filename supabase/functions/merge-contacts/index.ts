import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MergeRequest {
  existingContactId: string;
  newContactData: Record<string, any>;
}

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

    const { existingContactId, newContactData } = await req.json() as MergeRequest;

    if (!existingContactId) {
      return new Response(JSON.stringify({ error: 'existingContactId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============= RESOURCE ACCESS CHECK =============
    const hasAccess = await verifyResourceAccess(supabase, 'contacts', existingContactId, tenantId);
    if (!hasAccess) {
      return accessDeniedResponse(corsHeaders, 'Access denied to this contact');
    }
    // ============= END RESOURCE ACCESS CHECK =============

    console.log(`Merging contact ${existingContactId} in tenant ${tenantId}`);

    const { data: existingContact, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', existingContactId)
      .single();

    if (fetchError || !existingContact) {
      return new Response(JSON.stringify({ error: 'Existing contact not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const mergedData: Record<string, any> = {};
    const simpleFields = ['email', 'phone', 'company', 'position', 'city', 'linkedin_url', 'source', 'primary_group_id', 'company_id'];

    for (const field of simpleFields) {
      if (!existingContact[field] && newContactData[field]) {
        mergedData[field] = newContactData[field];
      }
    }

    // Merge tags
    const existingTags = new Set(existingContact.tags || []);
    const newTags = new Set(newContactData.tags || []);
    const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
    if (JSON.stringify(mergedTags) !== JSON.stringify(existingContact.tags || [])) {
      mergedData.tags = mergedTags;
    }

    // Merge notes
    if (newContactData.notes && existingContact.notes !== newContactData.notes) {
      if (!existingContact.notes) {
        mergedData.notes = newContactData.notes;
      } else {
        mergedData.notes = `${existingContact.notes}\n\n---\n\n${newContactData.notes}`;
      }
    }

    if (Object.keys(mergedData).length > 0) {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ ...mergedData, updated_at: new Date().toISOString() })
        .eq('id', existingContactId);

      if (updateError) throw updateError;

      await supabase.from('contact_merge_history').insert({
        tenant_id: tenantId,
        primary_contact_id: existingContactId,
        merged_contact_data: newContactData,
        merge_source: 'manual'
      });
    }

    const { data: updatedContact } = await supabase.from('contacts').select('*').eq('id', existingContactId).single();

    return new Response(
      JSON.stringify({ success: true, contact: updatedContact, merged: true, fieldsUpdated: Object.keys(mergedData) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
