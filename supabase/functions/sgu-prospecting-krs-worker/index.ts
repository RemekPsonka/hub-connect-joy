// SGU-06: Worker for prospecting KRS jobs (cron-driven, 1 job per tick)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { callLLM } from '../_shared/llm-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Criteria {
  pkd_code?: string;
  pkd_codes?: string[];
  wojewodztwo?: string;
  miasto?: string;
  employees_min?: number;
  employees_max?: number;
  forma_prawna?: string[];
  active_only?: boolean;
  max_results?: number;
}

interface Job {
  id: string;
  tenant_id: string;
  actor_user_id: string | null;
  payload: Criteria;
  result: { next_offset?: number; candidates_added?: number } | null;
  status: string;
  progress: number;
}

interface CompanyCandidate {
  name: string;
  nip: string | null;
  krs: string | null;
  city: string | null;
  street: string | null;
  postal: string | null;
  pkd_codes: string[] | null;
  primary_pkd: string | null;
  employees_estimate: number | null;
  founded_year: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

const BATCH_PER_TICK = 30; // Limit per Deno timeout (with sleep + LLM)
const SLEEP_BETWEEN_MS = 500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Source of candidates: query existing public.companies table filtered by criteria.
 * Public KRS API does not support listing by PKD without auth, so MVP uses CRM data
 * as the candidate pool. Enrichment per-company can still call fetch-krs-data later.
 */
async function fetchCandidates(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  criteria: Criteria,
  offset: number,
  limit: number,
): Promise<CompanyCandidate[]> {
  let q = supabase
    .from('companies')
    .select('id, name, nip, krs, city, address, postal_code, pkd_codes, employee_count, registration_date, phone, website')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (criteria.miasto) q = q.ilike('city', `%${criteria.miasto}%`);
  if (criteria.wojewodztwo) q = q.ilike('city', `%${criteria.wojewodztwo}%`);

  const pkdList: string[] = [];
  if (criteria.pkd_code) pkdList.push(criteria.pkd_code);
  if (criteria.pkd_codes) pkdList.push(...criteria.pkd_codes);
  if (pkdList.length > 0) {
    q = q.overlaps('pkd_codes', pkdList);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((c: any) => {
    const empCount = c.employee_count ? parseInt(String(c.employee_count).replace(/\D/g, ''), 10) : null;
    const regYear = c.registration_date ? new Date(c.registration_date).getFullYear() : null;
    const primary = Array.isArray(c.pkd_codes) && c.pkd_codes.length > 0 ? c.pkd_codes[0] : null;
    return {
      name: c.name,
      nip: c.nip ?? null,
      krs: c.krs ?? null,
      city: c.city ?? null,
      street: c.address ?? null,
      postal: c.postal_code ?? null,
      pkd_codes: c.pkd_codes ?? null,
      primary_pkd: primary,
      employees_estimate: Number.isFinite(empCount as number) ? (empCount as number) : null,
      founded_year: regYear,
      phone: c.phone ?? null,
      email: null,
      website: c.website ?? null,
    };
  });
}

async function scoreLead(company: CompanyCandidate, criteria: Criteria): Promise<{ score: number; reasoning: string; model: string }> {
  const prompt = `Oceń jak dobry lead dla agenta ubezpieczeniowego (skala 0-100).
Firma: ${company.name}
PKD: ${company.primary_pkd ?? 'brak'} ${company.pkd_codes?.join(', ') ?? ''}
Miasto: ${company.city ?? 'n/a'}
Zatrudnienie: ${company.employees_estimate ?? 'n/a'}
Rok założenia: ${company.founded_year ?? 'n/a'}
Telefon: ${company.phone ? 'tak' : 'brak'}
WWW: ${company.website ? 'tak' : 'brak'}

Kryteria wyszukiwania: PKD ${criteria.pkd_codes?.join(',') ?? criteria.pkd_code ?? '—'}, miasto ${criteria.miasto ?? '—'}, zatrudnienie ${criteria.employees_min ?? '?'}-${criteria.employees_max ?? '?'}.

Zwróć WYŁĄCZNIE poprawny JSON: {"score": liczba 0-100, "reasoning": "krótko po polsku, max 2 zdania"}`;

  try {
    const result = await callLLM({
      messages: [
        { role: 'system', content: 'Jesteś analitykiem leadów B2B dla branży ubezpieczeniowej w Polsce. Odpowiadasz wyłącznie poprawnym JSON.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
      context: { function_name: 'sgu-prospecting-krs-worker', persona: 'sgu_scorer' },
    });

    const text = result.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no_json_in_response');
    const parsed = JSON.parse(match[0]);
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    const reasoning = String(parsed.reasoning ?? '').slice(0, 500);
    return { score, reasoning, model: result.model };
  } catch (e) {
    console.error('LLM scoring fail:', (e as Error).message);
    return { score: 0, reasoning: 'AI scoring nie powiódł się — wymagana ręczna ocena.', model: 'fallback' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Auth: cron secret OR service-role bearer (since pg_cron uses service_role)
  const cronSecret = Deno.env.get('CRON_SECRET');
  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const isServiceRole = authHeader === `Bearer ${serviceKey}` && serviceKey.length > 0;
  const isCronSecret = cronSecret && headerSecret === cronSecret;
  if (!isServiceRole && !isCronSecret) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

  // Get next pending job (FOR UPDATE SKIP LOCKED via RPC)
  const { data: jobs, error: jobErr } = await supabase.rpc('sgu_next_prospecting_job');
  if (jobErr) {
    console.error('next_job RPC error:', jobErr);
    return json({ error: 'rpc_failed', detail: jobErr.message }, 500);
  }
  const jobRows = (jobs ?? []) as Job[];
  if (jobRows.length === 0) return json({ status: 'idle' });

  const job = jobRows[0];
  const criteria = job.payload;
  const offset = job.result?.next_offset ?? 0;
  const maxResults = Math.min(criteria.max_results ?? 100, 500);
  const remaining = Math.max(0, maxResults - offset);
  const tickLimit = Math.min(BATCH_PER_TICK, remaining);

  if (tickLimit === 0) {
    await supabase
      .from('background_jobs')
      .update({
        status: 'completed',
        progress: 100,
        finished_at: new Date().toISOString(),
        result: { ...(job.result ?? {}), candidates_added: offset },
      })
      .eq('id', job.id);
    return json({ status: 'completed', job_id: job.id });
  }

  let added = 0;
  const errors: { name: string; message: string }[] = [];

  try {
    const candidates = await fetchCandidates(supabase, job.tenant_id, criteria, offset, tickLimit);

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];

      // Skip if already exists for tenant (NIP or KRS)
      if (c.nip || c.krs) {
        const { data: existing } = await supabase
          .from('sgu_prospecting_candidates')
          .select('id')
          .eq('tenant_id', job.tenant_id)
          .or(`nip.eq.${c.nip ?? 'null'},krs_number.eq.${c.krs ?? 'null'}`)
          .maybeSingle();
        if (existing) continue;
      }

      const scoring = await scoreLead(c, criteria);

      const { error: insErr } = await supabase.from('sgu_prospecting_candidates').insert({
        tenant_id: job.tenant_id,
        source: 'krs',
        source_job_id: job.id,
        krs_number: c.krs,
        nip: c.nip,
        name: c.name,
        address_city: c.city,
        address_street: c.street,
        address_postal: c.postal,
        pkd_codes: c.pkd_codes,
        primary_pkd: c.primary_pkd,
        employees_estimate: c.employees_estimate,
        founded_year: c.founded_year,
        phone: c.phone,
        email: c.email,
        website: c.website,
        status: 'pending_review',
        ai_score: scoring.score,
        ai_reasoning: scoring.reasoning,
        ai_model: scoring.model,
      });

      if (insErr) {
        // Likely unique constraint violation — skip silently
        if (!insErr.message?.includes('duplicate key')) {
          errors.push({ name: c.name, message: insErr.message });
        }
      } else {
        added++;
      }

      // Update progress every 10 inserts
      if (i % 10 === 9) {
        const progressPct = Math.round(((offset + i + 1) / maxResults) * 100);
        await supabase
          .from('background_jobs')
          .update({ progress: Math.min(99, progressPct), updated_at: new Date().toISOString() })
          .eq('id', job.id);
      }

      await sleep(SLEEP_BETWEEN_MS);
    }

    const newOffset = offset + candidates.length;
    const isDone = candidates.length < tickLimit || newOffset >= maxResults;

    if (isDone) {
      await supabase
        .from('background_jobs')
        .update({
          status: 'completed',
          progress: 100,
          finished_at: new Date().toISOString(),
          result: { candidates_added: (job.result?.candidates_added ?? 0) + added, errors: errors.slice(0, 20) },
        })
        .eq('id', job.id);
    } else {
      await supabase
        .from('background_jobs')
        .update({
          progress: Math.min(99, Math.round((newOffset / maxResults) * 100)),
          result: {
            next_offset: newOffset,
            candidates_added: (job.result?.candidates_added ?? 0) + added,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }

    return json({ status: 'tick_done', job_id: job.id, added, next_offset: isDone ? null : newOffset });
  } catch (e) {
    console.error('worker tick error:', e);
    await supabase
      .from('background_jobs')
      .update({
        status: 'failed',
        error: (e as Error).message,
        finished_at: new Date().toISOString(),
        result: { ...(job.result ?? {}), candidates_added: (job.result?.candidates_added ?? 0) + added, errors },
      })
      .eq('id', job.id);
    return json({ status: 'failed', job_id: job.id, error: (e as Error).message }, 500);
  }
});
