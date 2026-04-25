// LLM Provider — Sprint 19a (triple fallback: Lovable Gateway → Anthropic → OpenAI)
// Streaming: tylko Lovable Gateway. Fallback chain działa wyłącznie dla stream:false.
// TODO(streaming-fallback): w osobnym sprincie dodać SSE-bridge dla Anthropic/OpenAI.

import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// Pricing in USD cents per 1k tokens (approx)
const PRICING: Record<string, { in: number; out: number }> = {
  'google/gemini-3-flash-preview': { in: 0.0125, out: 0.05 },
  'google/gemini-2.5-flash': { in: 0.0125, out: 0.05 },
  'google/gemini-2.5-flash-lite': { in: 0.005, out: 0.02 },
  'google/gemini-2.5-pro': { in: 0.125, out: 0.5 },
  'claude-3-5-haiku-latest': { in: 0.08, out: 0.4 },
  'claude-3-5-sonnet-latest': { in: 0.3, out: 1.5 },
  'gpt-4o-mini': { in: 0.015, out: 0.06 },
  'gpt-4o': { in: 0.25, out: 1.0 },
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
  provider?: string;
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
  metadata?: Record<string, unknown>;
}) {
  console.log(JSON.stringify({ kind: 'ai_usage', ...payload }));
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
  metadata?: Record<string, unknown>;
}) {
  const client = getAdminClient();
  if (!client) return;
  const ctx = payload.context;
  if (!ctx?.function_name) return;

  // Cast to `never` to avoid Deno TS overload mismatch on partitioned ai_usage_log table.
  const row = {
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
    metadata: payload.metadata ?? {},
  };
  await client.from('ai_usage_log').insert(row as never);
}

// ──────────────────────────────────────────────────────────────────────
// Model mapping helpers
// ──────────────────────────────────────────────────────────────────────

function mapToAnthropic(geminiModel: string): string {
  if (geminiModel.includes('pro')) return 'claude-3-5-sonnet-latest';
  return 'claude-3-5-haiku-latest';
}

function mapToOpenAI(geminiModel: string): string {
  if (geminiModel.includes('pro')) return 'gpt-4o';
  return 'gpt-4o-mini';
}

function splitSystemAndMessages(messages: LLMMessage[]): {
  system: string;
  rest: { role: 'user' | 'assistant'; content: string }[];
} {
  const systemParts: string[] = [];
  const rest: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content);
    } else if (m.role === 'user' || m.role === 'assistant') {
      rest.push({ role: m.role, content: m.content });
    }
    // tool/tool_calls: pomijamy w fallbacku (Anthropic/OpenAI fallback to plain chat)
  }
  return { system: systemParts.join('\n\n'), rest };
}

// ──────────────────────────────────────────────────────────────────────
// Provider: Anthropic
// ──────────────────────────────────────────────────────────────────────

async function callAnthropic(
  opts: CallLLMOptions,
  geminiModel: string,
  attempt: number,
  fallback_reason: string,
): Promise<LLMResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const t0 = Date.now();
  const model = mapToAnthropic(geminiModel);

  if (!apiKey) {
    logUsage({
      provider: 'anthropic',
      model,
      latency_ms: Date.now() - t0,
      request_id: opts.request_id,
      error: 'missing_api_key_anthropic',
      context: opts.context,
      metadata: { fallback_reason, attempt, skipped: true },
    });
    return { status: 0, model, provider: 'anthropic' };
  }

  const { system, rest } = splitSystemAndMessages(opts.messages);

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        ...(system ? { system } : {}),
        messages: rest,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logUsage({
        provider: 'anthropic',
        model,
        latency_ms: Date.now() - t0,
        request_id: opts.request_id,
        error: `${response.status}: ${body.slice(0, 200)}`,
        context: opts.context,
        metadata: { fallback_reason, attempt },
      });
      return { status: response.status, model, provider: 'anthropic' };
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '';
    const tokens_in = data?.usage?.input_tokens ?? 0;
    const tokens_out = data?.usage?.output_tokens ?? 0;
    const cost_cents = calcCostCents(model, tokens_in, tokens_out);

    logUsage({
      provider: 'anthropic',
      model,
      tokens_in,
      tokens_out,
      cost_cents,
      latency_ms: Date.now() - t0,
      request_id: opts.request_id,
      context: opts.context,
      metadata: { fallback_reason, attempt },
    });

    return { status: 200, model, text, tokens_in, tokens_out, cost_cents, provider: 'anthropic' };
  } catch (e) {
    logUsage({
      provider: 'anthropic',
      model,
      latency_ms: Date.now() - t0,
      request_id: opts.request_id,
      error: `throw: ${(e as Error).message}`.slice(0, 200),
      context: opts.context,
      metadata: { fallback_reason, attempt },
    });
    return { status: 599, model, provider: 'anthropic' };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Provider: OpenAI
// ──────────────────────────────────────────────────────────────────────

async function callOpenAI(
  opts: CallLLMOptions,
  geminiModel: string,
  attempt: number,
  fallback_reason: string,
): Promise<LLMResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const t0 = Date.now();
  const model = mapToOpenAI(geminiModel);

  if (!apiKey) {
    logUsage({
      provider: 'openai',
      model,
      latency_ms: Date.now() - t0,
      request_id: opts.request_id,
      error: 'missing_api_key_openai',
      context: opts.context,
      metadata: { fallback_reason, attempt, skipped: true },
    });
    return { status: 0, model, provider: 'openai' };
  }

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: opts.messages.map((m) => ({
          role: m.role === 'tool' ? 'tool' : m.role,
          content: m.content,
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          ...(m.name ? { name: m.name } : {}),
        })),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logUsage({
        provider: 'openai',
        model,
        latency_ms: Date.now() - t0,
        request_id: opts.request_id,
        error: `${response.status}: ${body.slice(0, 200)}`,
        context: opts.context,
        metadata: { fallback_reason, attempt },
      });
      return { status: response.status, model, provider: 'openai' };
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    const tokens_in = data?.usage?.prompt_tokens ?? 0;
    const tokens_out = data?.usage?.completion_tokens ?? 0;
    const cost_cents = calcCostCents(model, tokens_in, tokens_out);

    logUsage({
      provider: 'openai',
      model,
      tokens_in,
      tokens_out,
      cost_cents,
      latency_ms: Date.now() - t0,
      request_id: opts.request_id,
      context: opts.context,
      metadata: { fallback_reason, attempt },
    });

    return { status: 200, model, text, tokens_in, tokens_out, cost_cents, provider: 'openai' };
  } catch (e) {
    logUsage({
      provider: 'openai',
      model,
      latency_ms: Date.now() - t0,
      request_id: opts.request_id,
      error: `throw: ${(e as Error).message}`.slice(0, 200),
      context: opts.context,
      metadata: { fallback_reason, attempt },
    });
    return { status: 599, model, provider: 'openai' };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Public: callLLM with triple fallback (non-streaming only)
// ──────────────────────────────────────────────────────────────────────

export async function callLLM(opts: CallLLMOptions): Promise<LLMResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const model = opts.model_hint ?? DEFAULT_MODEL;
  const stream = opts.stream ?? true;
  const requestId = opts.request_id ?? crypto.randomUUID();
  const t0 = Date.now();

  // ─── Attempt 1: Lovable Gateway ───
  let lovableResponse: Response | null = null;
  let lovableThrew: Error | null = null;
  try {
    lovableResponse = await fetch(LOVABLE_GATEWAY_URL, {
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
  } catch (e) {
    lovableThrew = e as Error;
  }

  const lovableFailed =
    lovableThrew !== null ||
    !lovableResponse ||
    !lovableResponse.ok ||
    RETRYABLE_STATUSES.has(lovableResponse.status);

  // ─── Streaming path: Lovable only, no fallback ───
  // TODO(streaming-fallback): SSE bridge for Anthropic/OpenAI in a separate sprint.
  if (stream) {
    if (lovableFailed) {
      const errMsg = lovableThrew
        ? `throw: ${lovableThrew.message}`
        : `${lovableResponse?.status ?? 0}: stream_failed`;
      logUsage({
        provider: 'lovable',
        model,
        latency_ms: Date.now() - t0,
        request_id: requestId,
        error: errMsg.slice(0, 200),
        context: opts.context,
        metadata: { fallback_reason: 'none_stream_mode', attempt: 1, stream: true },
      });
      return { status: lovableResponse?.status ?? 503, model, provider: 'lovable' };
    }
    return {
      status: lovableResponse!.status,
      model,
      stream: lovableResponse!.body ?? undefined,
      provider: 'lovable',
    };
  }

  // ─── Non-streaming path: parse Lovable result, fallback if needed ───
  if (!lovableFailed && lovableResponse) {
    const data = await lovableResponse.json();
    const message = data?.choices?.[0]?.message;
    let text: string = message?.content ?? '';
    // Fallback: when tool_choice forces a tool call, content is empty and
    // arguments live in tool_calls[0].function.arguments — surface as text
    // so callers using tool_choice="required" can JSON.parse the result.
    if (!text && Array.isArray(message?.tool_calls) && message.tool_calls.length > 0) {
      const args = message.tool_calls[0]?.function?.arguments;
      if (typeof args === 'string') text = args;
      else if (args) text = JSON.stringify(args);
    }
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
      metadata: { attempt: 1 },
    });

    return { status: 200, model, text, tokens_in, tokens_out, cost_cents, provider: 'lovable' };
  }

  // Lovable failed — log and continue to fallback chain
  const lovableStatus = lovableResponse?.status ?? 0;
  const lovableErrBody = lovableResponse
    ? await lovableResponse.text().catch(() => '')
    : '';
  const fallback_reason = lovableThrew
    ? `lovable_throw`
    : lovableStatus === 429
      ? 'lovable_429'
      : lovableStatus >= 500
        ? `lovable_${lovableStatus}`
        : `lovable_${lovableStatus}`;

  logUsage({
    provider: 'lovable',
    model,
    latency_ms: Date.now() - t0,
    request_id: requestId,
    error: lovableThrew
      ? `throw: ${lovableThrew.message}`.slice(0, 200)
      : `${lovableStatus}: ${lovableErrBody.slice(0, 200)}`,
    context: opts.context,
    metadata: { attempt: 1, will_fallback: true },
  });

  // ─── Attempt 2: Anthropic ───
  const anthropicResult = await callAnthropic(opts, model, 2, fallback_reason);
  if (anthropicResult.status === 200) {
    return anthropicResult;
  }

  // ─── Attempt 3: OpenAI ───
  const openaiResult = await callOpenAI(opts, model, 3, fallback_reason);
  if (openaiResult.status === 200) {
    return openaiResult;
  }

  // ─── All providers failed ───
  logUsage({
    provider: 'none',
    model: 'none',
    latency_ms: Date.now() - t0,
    request_id: requestId,
    error: 'all_providers_failed',
    context: opts.context,
    metadata: {
      fallback_reason,
      lovable_status: lovableStatus,
      anthropic_status: anthropicResult.status,
      openai_status: openaiResult.status,
    },
  });

  return { status: 503, model: 'none', provider: 'none' };
}
