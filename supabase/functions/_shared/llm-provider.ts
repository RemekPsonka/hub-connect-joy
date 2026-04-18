// LLM Provider — Sprint 04 (Lovable AI Gateway only, fallback w S05)
// Sprint 10: persist usage to public.ai_usage_log via service_role client.

import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

// Pricing in USD cents per 1k tokens (approx, Gemini Flash preview)
const PRICING: Record<string, { in: number; out: number }> = {
  'google/gemini-3-flash-preview': { in: 0.0125, out: 0.05 },
  'google/gemini-2.5-flash': { in: 0.0125, out: 0.05 },
  'google/gemini-2.5-flash-lite': { in: 0.005, out: 0.02 },
  'google/gemini-2.5-pro': { in: 0.125, out: 0.5 },
};

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
}

export interface LLMCallContext {
  function_name: string;
  persona?: string;
  actor_id?: string;
  tenant_id?: string;
}

export interface CallLLMOptions {
  messages: LLMMessage[];
  model_hint?: string;
  stream?: boolean;
  request_id?: string;
  tools?: unknown[];
  tool_choice?: 'auto' | 'none' | 'required';
  context?: LLMCallContext;
}

export interface LLMResult {
  stream?: ReadableStream<Uint8Array>;
  status: number;
  model: string;
  text?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_cents?: number;
}

export function calcCostCents(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model] ?? PRICING[DEFAULT_MODEL];
  return Number(((tokensIn / 1000) * p.in + (tokensOut / 1000) * p.out).toFixed(4));
}

export function logUsage(payload: {
  provider: string;
  model: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_cents?: number;
  latency_ms: number;
  request_id?: string;
  error?: string;
  context?: LLMCallContext;
}) {
  // Strukturalny log JSON (debugowy)
  console.log(JSON.stringify({ kind: 'ai_usage', ...payload }));

  // Sprint 10: persist do ai_usage_log (best-effort, nie blokuje)
  persistUsage(payload).catch((e) => {
    console.error('[ai_usage_log] persist failed:', e);
  });
}

let _adminClient: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (_adminClient) return _adminClient;
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;
  _adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _adminClient;
}

async function persistUsage(payload: {
  provider: string;
  model: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_cents?: number;
  latency_ms: number;
  request_id?: string;
  error?: string;
  context?: LLMCallContext;
}) {
  const client = getAdminClient();
  if (!client) return;
  const ctx = payload.context;
  if (!ctx?.function_name) return; // bez kontekstu nie logujemy

  await client.from('ai_usage_log').insert({
    function_name: ctx.function_name,
    persona: ctx.persona ?? null,
    provider: payload.provider,
    model: payload.model,
    tokens_in: payload.tokens_in ?? 0,
    tokens_out: payload.tokens_out ?? 0,
    cost_cents: payload.cost_cents ?? 0,
    latency_ms: payload.latency_ms,
    request_id: payload.request_id ?? null,
    actor_id: ctx.actor_id ?? null,
    tenant_id: ctx.tenant_id ?? null,
    error: payload.error ?? null,
    metadata: {},
  });
}

/**
 * Wywołanie Lovable AI Gateway. Zwraca surowy stream SSE (gdy stream=true)
 * lub pełną odpowiedź tekstową (gdy stream=false).
 */
export async function callLLM(opts: CallLLMOptions): Promise<LLMResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const model = opts.model_hint ?? DEFAULT_MODEL;
  const stream = opts.stream ?? true;
  const requestId = opts.request_id ?? crypto.randomUUID();
  const t0 = Date.now();

  const response = await fetch(LOVABLE_GATEWAY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      stream,
      ...(opts.tools && opts.tools.length > 0 ? { tools: opts.tools } : {}),
      ...(opts.tool_choice ? { tool_choice: opts.tool_choice } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logUsage({
      provider: 'lovable',
      model,
      latency_ms: Date.now() - t0,
      request_id: requestId,
      error: `${response.status}: ${body.slice(0, 200)}`,
      context: opts.context,
    });
    return { status: response.status, model };
  }

  if (stream) {
    return {
      status: response.status,
      model,
      stream: response.body ?? undefined,
    };
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  const tokens_in = data?.usage?.prompt_tokens ?? 0;
  const tokens_out = data?.usage?.completion_tokens ?? 0;
  const cost_cents = calcCostCents(model, tokens_in, tokens_out);

  logUsage({
    provider: 'lovable',
    model,
    tokens_in,
    tokens_out,
    cost_cents,
    latency_ms: Date.now() - t0,
    request_id: requestId,
    context: opts.context,
  });

  return { status: 200, model, text, tokens_in, tokens_out, cost_cents };
}
