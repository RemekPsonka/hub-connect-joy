// SGU-07: Manualny enqueue web prospecting joba (button "Uruchom teraz" per source)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const auth = await verifyAuth(req, supabase);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const [{ data: isPartner }, { data: directorId }, { data: tenantId }] = await Promise.all([
      userClient.rpc('is_sgu_partner'),
      userClient.rpc('get_current_director_id'),
      userClient.rpc('get_current_tenant_id'),
    ]);

    if (!isPartner && !directorId) {
      return json({ error: 'forbidden: SGU partner or director required' }, 403);
    }
    if (!tenantId) return json({ error: 'no_tenant' }, 400);

    const body = await req.json().catch(() => ({}));
    const sourceId = body.source_id as string | undefined;
    if (!sourceId) return json({ error: 'source_id_required' }, 400);

    // Verify source exists and belongs to tenant
    const { data: source, error: srcErr } = await supabase
      .from('sgu_web_sources')
      .select('id, tenant_id, name, active')
      .eq('id', sourceId)
      .maybeSingle();

    if (srcErr || !source) return json({ error: 'source_not_found' }, 404);
    if (source.tenant_id !== tenantId) return json({ error: 'forbidden' }, 403);

    // Daily quota: max 20 web jobs / user / 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('background_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('actor_user_id', auth.user.id)
      .eq('job_type', 'sgu_web_prospecting')
      .gte('created_at', since);

    if ((recentCount ?? 0) >= 20) {
      return json({ error: 'daily_quota_exceeded', detail: 'Max 20 web jobów / 24h' }, 429);
    }

    const { data: job, error: insErr } = await supabase
      .from('background_jobs')
      .insert({
        tenant_id: tenantId,
        actor_id: null,
        actor_user_id: auth.user.id,
        job_type: 'sgu_web_prospecting',
        payload: { source_id: sourceId },
        status: 'pending',
        progress: 0,
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('Insert background_job error:', insErr);
      return json({ error: 'enqueue_failed', detail: insErr.message }, 500);
    }

    return json({ job_id: job.id, source_name: source.name });
  } catch (e) {
    console.error('sgu-prospecting-web error:', e);
    return json({ error: 'internal_error', detail: (e as Error).message }, 500);
  }
});
