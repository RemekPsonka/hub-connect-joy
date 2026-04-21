// Cron-only worker: przywraca odłożone kontakty po upływie snoozed_until.
// Wywoływane z pg_cron przez net.http_post (verify_jwt=false, brak user JWT).
// Walidacja w kodzie: wymagamy bearer = service_role key.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  if (!SERVICE_ROLE || !SUPABASE_URL) {
    return new Response(JSON.stringify({ error: 'missing env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Bearer must equal service_role (cron only).
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${SERVICE_ROLE}`) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const today = new Date().toISOString().split('T')[0];

  const { data: due, error: selErr } = await supabase
    .from('deal_team_contacts')
    .select('id, snoozed_from_category')
    .not('snoozed_until', 'is', null)
    .lte('snoozed_until', today);

  if (selErr) {
    return new Response(JSON.stringify({ error: selErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: { id: string; ok: boolean; err?: string }[] = [];
  for (const c of due ?? []) {
    const restoreCategory = (c as { snoozed_from_category: string | null }).snoozed_from_category ?? '10x';
    const { error: updErr } = await supabase
      .from('deal_team_contacts')
      .update({
        category: restoreCategory,
        snoozed_until: null,
        snooze_reason: null,
        snoozed_from_category: null,
      } as never)
      .eq('id', (c as { id: string }).id);
    results.push({ id: (c as { id: string }).id, ok: !updErr, err: updErr?.message });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});