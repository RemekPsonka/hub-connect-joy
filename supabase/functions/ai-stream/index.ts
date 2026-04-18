// Sprint 04: Generyczny streaming endpoint AI dla featurów (konsultacje, spotkania).
// To NIE jest persona chat (Sovra) — to bezstanowy helper AI dla pre-existing featurów.
// Konsumenci: src/hooks/useAIChat.ts (consultations brief/summary, meeting recommendations).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { callLLM, type LLMMessage } from '../_shared/llm-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RequestBody {
  messages: LLMMessage[];
  model?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = await verifyAuth(req, supabase);
  if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);

  const rl = await checkRateLimit(`ai-stream:${auth.user.id}`, { max: 60, window: 60 });
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const llm = await callLLM({
    messages: body.messages,
    model_hint: body.model,
    stream: true,
  });

  if (llm.status === 429 || llm.status === 402) {
    return new Response(JSON.stringify({ error: llm.status === 429 ? 'Rate limit' : 'Payment required' }), {
      status: llm.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (llm.status !== 200 || !llm.stream) {
    return new Response(JSON.stringify({ error: 'AI gateway error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(llm.stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
});
