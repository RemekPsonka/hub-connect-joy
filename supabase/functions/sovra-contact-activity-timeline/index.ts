// Sprint RD-A2: Contact V2 — unified activity timeline (cienki wrapper na RPC).
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const auth = await verifyAuth(req, supabase);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);

    const { contact_id, filter = 'all', limit = 50, before } = await req.json();
    if (!contact_id) {
      return new Response(JSON.stringify({ error: 'contact_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify tenant ownership of contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', contact_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!contact) {
      return new Response(JSON.stringify({ items: [], has_more: false, error: 'forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cappedLimit = Math.min(Number(limit) || 50, 100);
    const { data, error } = await supabase.rpc('rpc_contact_timeline', {
      p_contact_id: contact_id,
      p_filter: filter,
      p_limit: cappedLimit,
      p_before: before ?? null,
    });

    if (error) {
      console.error('[sovra-contact-activity-timeline] rpc error', error);
      return new Response(
        JSON.stringify({ items: [], has_more: false, fallback: true, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ items: data ?? [], has_more: (data?.length ?? 0) === cappedLimit }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[sovra-contact-activity-timeline]', e);
    return new Response(
      JSON.stringify({ items: [], error: (e as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }
});
