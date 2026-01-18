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

    const { contact } = await req.json();

    if (!contact.first_name || !contact.last_name) {
      return new Response(JSON.stringify({ isDuplicate: false, existingContact: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use tenant from auth, not from request
    const { data: duplicates, error } = await supabase.rpc('find_duplicate_contact', {
      p_tenant_id: tenantId,
      p_first_name: contact.first_name,
      p_last_name: contact.last_name,
      p_email: contact.email || null,
      p_phone: contact.phone || null,
    });

    if (error) {
      console.error('Error checking duplicate:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (duplicates && duplicates.length > 0) {
      const dup = duplicates[0];
      return new Response(
        JSON.stringify({
          isDuplicate: true,
          existingContact: {
            id: dup.contact_id,
            first_name: dup.contact_first_name,
            last_name: dup.contact_last_name,
            full_name: dup.contact_full_name,
            email: dup.contact_email,
            phone: dup.contact_phone,
            company: dup.contact_company,
            position: dup.contact_position,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ isDuplicate: false, existingContact: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Error in check-duplicate-contact:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
