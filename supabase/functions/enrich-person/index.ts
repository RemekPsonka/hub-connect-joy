import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified person enrichment orchestrator.
 *
 * NEW shape (preferred):
 *   { contact_id?, steps?: Array<'linkedin' | 'profile' | 'data'>, ...stepArgs }
 *   - default steps: ['data'] (back-compat z poprzednim 'full')
 *   - zwraca { results: { linkedin?, profile?, data? }, errors? }
 *
 * LEGACY shape (back-compat):
 *   { mode: 'full' | 'profile' | 'linkedin', ...args }
 *   - mapowane: full→data, profile→profile, linkedin→linkedin
 *   - zwraca payload pojedynczego wywołania (jak wcześniej, transparentnie)
 *
 * Internal targets (NIE wołać bezpośrednio z FE):
 *   - 'data'     → enrich-person-data
 *   - 'profile'  → generate-contact-profile
 *   - 'linkedin' → analyze-linkedin-profile
 */

type Step = 'linkedin' | 'profile' | 'data';

const STEP_TO_FN: Record<Step, string> = {
  data: 'enrich-person-data',
  profile: 'generate-contact-profile',
  linkedin: 'analyze-linkedin-profile',
};

const LEGACY_MODE_TO_STEP: Record<string, Step> = {
  full: 'data',
  profile: 'profile',
  linkedin: 'linkedin',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // ---------- LEGACY shape: { mode } ----------
    if (body?.mode && LEGACY_MODE_TO_STEP[body.mode]) {
      const step = LEGACY_MODE_TO_STEP[body.mode];
      const target = STEP_TO_FN[step];
      const { mode: _ignored, ...forwardBody } = body;
      console.log(`[enrich-person] legacy mode=${body.mode} → ${target}`);
      const { data, error } = await client.functions.invoke(target, { body: forwardBody });
      if (error) {
        return new Response(JSON.stringify({ error: error.message ?? String(error) }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify(data ?? {}), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ---------- NEW shape: { contact_id, steps?, ... } ----------
    const requested: Step[] = Array.isArray(body?.steps) && body.steps.length > 0
      ? body.steps.filter((s: string): s is Step => s in STEP_TO_FN)
      : ['data'];

    if (requested.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid steps provided. Allowed: linkedin, profile, data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { steps: _ignored, ...forwardBody } = body;

    const results: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    for (const step of requested) {
      const target = STEP_TO_FN[step];
      console.log(`[enrich-person] step=${step} → ${target}`);
      const { data, error } = await client.functions.invoke(target, { body: forwardBody });
      if (error) {
        console.error(`[enrich-person] ${target} error`, error);
        errors[step] = error.message ?? String(error);
      } else {
        results[step] = data ?? { ok: true };
      }
    }

    return new Response(JSON.stringify({
      success: Object.keys(errors).length === 0,
      results,
      ...(Object.keys(errors).length > 0 ? { errors } : {}),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[enrich-person] fatal', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
