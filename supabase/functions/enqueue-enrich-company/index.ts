import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

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

    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) return unauthorizedResponse(authResult, corsHeaders);
    const { tenantId, directorId } = authResult;

    if (!directorId) {
      return new Response(JSON.stringify({ error: 'Only directors can enqueue enrichment jobs' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const companyId = body?.company_id;
    if (!companyId || typeof companyId !== 'string') {
      return new Response(JSON.stringify({ error: 'company_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const hasAccess = await verifyResourceAccess(supabase, 'companies', companyId, tenantId);
    if (!hasAccess) return accessDeniedResponse(corsHeaders, 'Access denied to this company');

    // Avoid duplicate active jobs for same company
    const { data: existing } = await supabase
      .from('background_jobs')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('job_type', 'enrich_company')
      .in('status', ['pending', 'running'])
      .filter('payload->>company_id', 'eq', companyId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ job_id: existing.id, status: existing.status, deduplicated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: job, error } = await supabase
      .from('background_jobs')
      .insert({
        tenant_id: tenantId,
        actor_id: directorId,
        job_type: 'enrich_company',
        payload: { company_id: companyId, options: body?.options ?? {} },
        status: 'pending',
        progress: 0,
      })
      .select('id')
      .single();

    if (error || !job) {
      console.error('[enqueue-enrich-company] insert error', error);
      return new Response(JSON.stringify({ error: 'Failed to enqueue job' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ job_id: job.id, status: 'pending' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[enqueue-enrich-company] error', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
