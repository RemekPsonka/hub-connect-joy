import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OcrItem {
  image_base64?: string;
  image?: string;
  filename?: string;
}

/**
 * Unified OCR endpoint. Accepts:
 *   { items: [{ image_base64 | image, filename? }, ...] }
 * Returns:
 *   { results: [...] }  (one entry per input item)
 *
 * Routes to single-card OCR for one item, batch for many. This preserves
 * battle-tested AI logic in the underlying functions.
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
    const items: OcrItem[] = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: 'items array is required and must contain at least 1 entry' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    if (items.length === 1) {
      const item = items[0];
      const image = item.image_base64 ?? item.image;
      const { data, error } = await client.functions.invoke('ocr-business-card', {
        body: { image, filename: item.filename }
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message ?? String(error) }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ results: [data] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Multiple items → use batch under the hood
    const batchBody = {
      images: items.map(i => i.image_base64 ?? i.image),
      filenames: items.map(i => i.filename),
    };
    const { data, error } = await client.functions.invoke('ocr-business-cards-batch', { body: batchBody });
    if (error) {
      return new Response(JSON.stringify({ error: error.message ?? String(error) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // Underlying batch returns its own shape; pass through plus normalize to results[]
    const payload = (data ?? {}) as Record<string, unknown>;
    const results = Array.isArray(payload.results) ? payload.results : Array.isArray(payload.data) ? payload.data : data;
    return new Response(JSON.stringify({ results, raw: payload }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[ocr-business-cards] fatal', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
