import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PipelineStep {
  name: string;
  fn: string;
  progress: number;
}

const PIPELINE: PipelineStep[] = [
  { name: 'verify-source', fn: 'verify-company-source', progress: 20 },
  { name: 'scan-website', fn: 'scan-company-website', progress: 40 },
  { name: 'analyze-external', fn: 'analyze-company-external', progress: 60 },
  { name: 'fetch-financials', fn: 'fetch-company-financials', progress: 80 },
  { name: 'synthesize-profile', fn: 'synthesize-company-profile', progress: 100 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Atomic claim: SELECT ... FOR UPDATE SKIP LOCKED via RPC-less approach.
    // Use PostgREST: we need atomic claim → use SQL via pg-call. Fallback: 2-step with optimistic check.
    // Approach: fetch oldest pending → conditional update (status='pending') to 'running'.
    const { data: candidates, error: selErr } = await supabase
      .from('background_jobs')
      .select('id, payload, tenant_id, actor_id')
      .eq('status', 'pending')
      .eq('job_type', 'enrich_company')
      .order('created_at', { ascending: true })
      .limit(5);

    if (selErr) {
      console.error('[worker] select error', selErr);
      return new Response(JSON.stringify({ error: selErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: 'no pending jobs' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let claimed: typeof candidates[0] | null = null;
    for (const c of candidates) {
      const { data: updated, error: upErr } = await supabase
        .from('background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString(), progress: 5 })
        .eq('id', c.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (!upErr && updated) {
        claimed = c;
        break;
      }
    }

    if (!claimed) {
      return new Response(JSON.stringify({ processed: 0, message: 'race lost' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const jobId = claimed.id;
    const companyId = (claimed.payload as Record<string, unknown>)?.company_id as string;
    console.log(`[worker] claimed job ${jobId} for company ${companyId}`);

    if (!companyId) {
      await supabase.from('background_jobs').update({
        status: 'failed', error: 'Missing company_id in payload', finished_at: new Date().toISOString()
      }).eq('id', jobId);
      return new Response(JSON.stringify({ processed: 1, status: 'failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const stepResults: Record<string, unknown> = {};
    try {
      for (const step of PIPELINE) {
        console.log(`[worker] step ${step.name} for company ${companyId}`);
        const { data, error } = await supabase.functions.invoke(step.fn, {
          body: { companyId, company_id: companyId },
        });
        if (error) {
          console.error(`[worker] step ${step.name} failed`, error);
          // Don't abort whole pipeline on a single failure — record and continue
          stepResults[step.name] = { error: error.message ?? String(error) };
        } else {
          stepResults[step.name] = data ?? { ok: true };
        }
        await supabase.from('background_jobs').update({
          progress: step.progress,
          result: stepResults,
        }).eq('id', jobId);
      }

      await supabase.from('background_jobs').update({
        status: 'completed',
        progress: 100,
        finished_at: new Date().toISOString(),
        result: stepResults,
      }).eq('id', jobId);

      return new Response(JSON.stringify({ processed: 1, status: 'completed', jobId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (innerErr) {
      console.error('[worker] pipeline error', innerErr);
      await supabase.from('background_jobs').update({
        status: 'failed',
        error: innerErr instanceof Error ? innerErr.message : String(innerErr),
        finished_at: new Date().toISOString(),
        result: stepResults,
      }).eq('id', jobId);
      return new Response(JSON.stringify({ processed: 1, status: 'failed', jobId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('[worker] fatal', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
