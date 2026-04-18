// LLM Provider — Sprint 04 (Lovable AI Gateway only, fallback w S05)
// Inline cost calculation (do ai_usage_log w S10)

const LOVABLE_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

// TODO(S10): pricing → ai_usage_log + tabela cenników
// Ceny w centach USD per 1k tokens (przybliżone, Gemini Flash preview)
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

export interface CallLLMOptions {
  messages: LLMMessage[];
  model_hint?: string;
  stream?: boolean;
  request_id?: string;
  tools?: unknown[];
  tool_choice?: 'auto' | 'none' | 'required';
}

export interface LLMResult {
  /** Stream body (SSE) — present when stream=true */
  stream?: ReadableStream<Uint8Array>;
  /** Status from gateway */
  status: number;
  /** Model that was used */
  model: string;
  /** For non-stream calls only */
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
}) {
  // Strukturalny log JSON (later picked up by ai_usage_log w S10)
  console.log(JSON.stringify({ kind: 'ai_usage', ...payload }));
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
    });
    return { status: response.status, model };
  }

  if (stream) {
    // Stream do bezpośredniego forwardingu klientowi.
    // Cost calc zrobi handler na podstawie zliczonych tokenów po stronie usage delta lub fallback estymaty.
    return {
      status: response.status,
      model,
      stream: response.body ?? undefined,
    };
  }

  // Non-stream: pełna odpowiedź
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
  });

  return { status: 200, model, text, tokens_in, tokens_out, cost_cents };
}
