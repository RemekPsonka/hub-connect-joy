// SGU-06: Enqueue prospecting KRS job
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Criteria {
  pkd_code?: string;
  pkd_codes?: string[];
  wojewodztwo?: string;
  miasto?: string;
  promien_km?: number;
  revenue_min_pln?: number;
  revenue_max_pln?: number;
  employees_min?: number;
  employees_max?: number;
  forma_prawna?: string[];
  active_only?: boolean;
  max_results?: number;
}

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

    const criteria = (await req.json()) as Criteria;

    if (
      !criteria.pkd_code &&
      (!criteria.pkd_codes || criteria.pkd_codes.length === 0) &&
      !criteria.wojewodztwo &&
      !criteria.miasto
    ) {
      return json({ error: 'at_least_one_filter_required (PKD or województwo or miasto)' }, 400);
    }

    const maxResults = Math.min(criteria.max_results ?? 100, 500);
    if (maxResults < 1) return json({ error: 'max_results_invalid' }, 400);

    // Daily quota: max 5 jobs / user / 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('background_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('actor_user_id', auth.user.id)
      .eq('job_type', 'sgu_krs_prospecting')
      .gte('created_at', since);

    if ((recentCount ?? 0) >= 5) {
      return json({ error: 'daily_quota_exceeded', detail: 'Max 5 jobów / 24h' }, 429);
    }

    const { data: job, error: insErr } = await supabase
      .from('background_jobs')
      .insert({
        tenant_id: tenantId,
        actor_id: null,
        actor_user_id: auth.user.id,
        job_type: 'sgu_krs_prospecting',
        payload: { ...criteria, max_results: maxResults },
        status: 'pending',
        progress: 0,
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('Insert background_job error:', insErr);
      return json({ error: 'enqueue_failed', detail: insErr.message }, 500);
    }

    const estimatedMinutes = Math.max(1, Math.ceil((maxResults * 2) / 60));
    return json({ job_id: job.id, estimated_minutes: estimatedMinutes });
  } catch (e) {
    console.error('sgu-prospecting-krs error:', e);
    return json({ error: 'internal_error', detail: (e as Error).message }, 500);
  }
});
