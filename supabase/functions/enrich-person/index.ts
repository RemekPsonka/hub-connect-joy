import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Unified person enrichment orchestrator.
 *
 * Modes:
 *  - 'full' (default): Perplexity/web research → enrich-person-data.
 *  - 'profile': AI profile synthesis from notes/data → generate-contact-profile.
 *  - 'linkedin': LinkedIn URL deep analysis → analyze-linkedin-profile.
 *
 * Body shape is forwarded transparently to the underlying function (auth header
 * is also forwarded so existing per-tenant authorization keeps working).
 */
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
    const mode = (body?.mode ?? 'full') as 'full' | 'profile' | 'linkedin';

    const targetMap: Record<string, string> = {
      full: 'enrich-person-data',
      profile: 'generate-contact-profile',
      linkedin: 'analyze-linkedin-profile',
    };
    const target = targetMap[mode];
    if (!target) {
      return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Strip mode before forwarding
    const { mode: _ignored, ...forwardBody } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    console.log(`[enrich-person] mode=${mode} → ${target}`);

    const { data, error } = await client.functions.invoke(target, { body: forwardBody });

    if (error) {
      console.error(`[enrich-person] ${target} error`, error);
      return new Response(JSON.stringify({ error: error.message ?? String(error) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data ?? {}), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[enrich-person] fatal', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
