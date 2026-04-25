// Sprint 05 — Sovra 2.0 chat endpoint with tool calling
// POST /sovra { conversation_id?, message, scope_type?, scope_id? }
// → SSE stream (OpenAI delta + custom events: tool_result, pending_action)

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { calcCostCents, logUsage, type LLMMessage } from '../_shared/llm-provider.ts';
import { captureException } from '../_shared/sentry.ts';
import { buildSovraPrompt, type ScopeContext } from '../_shared/prompts/sovra.v1.ts';
import {
  TOOLS,
  isReadTool,
  isKnownTool,
  executeReadTool,
  createPendingAction,
  type ToolContext,
} from './tools.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Expose-Headers': 'X-Sovra-Conversation-Id',
};

interface RequestBody {
  conversation_id?: string | null;
  message: string;
  scope_type?: string | null;
  scope_id?: string | null;
}

interface ToolCallAccumulator {
  id: string;
  name: string;
  arguments: string; // accumulated JSON string
}

const HISTORY_LIMIT = 20;
const MAX_TOOL_ITERATIONS = 5;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const requestId = crypto.randomUUID();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1. Auth
  const auth = await verifyAuth(req, supabase);
  if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
  if (auth.userType !== 'director' || !auth.directorId) {
    return new Response(JSON.stringify({ error: 'Sovra is available only for directors' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Sprint 10: lazy expire pending actions (taniej niż pg_cron)
  try {
    await supabase
      .from('sovra_pending_actions')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .eq('tenant_id', auth.tenantId)
      .lt('expires_at', new Date().toISOString());
  } catch (e) {
    console.error('lazy-expire failed:', e);
  }

  // User-scoped client for RPC (RLS-aware)
  const authHeader = req.headers.get('Authorization')!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // 2. Rate limit
  const rl = await checkRateLimit(`sovra:${auth.user.id}`, { max: 30, window: 60 });
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Parse body
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const message = (body.message ?? '').trim();
  if (!message) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const scopeType = body.scope_type || 'global';
  const scopeId = body.scope_id || null;

  // 4. Get/create conversation
  let conversationId = body.conversation_id ?? null;
  if (conversationId) {
    const { data: existing, error } = await supabase
      .from('ai_conversations')
      .select('id, tenant_id, actor_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (error || !existing || existing.actor_id !== auth.directorId || existing.tenant_id !== auth.tenantId) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    const title = message.length > 60 ? message.slice(0, 57) + '...' : message;
    const { data: created, error: createErr } = await supabase
      .from('ai_conversations')
      .insert({
        tenant_id: auth.tenantId,
        actor_id: auth.directorId,
        persona: 'sovra',
        scope_type: scopeType,
        scope_id: scopeId,
        title,
      })
      .select('id')
      .single();
    if (createErr || !created) {
      console.error('Failed to create conversation:', createErr);
      return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    conversationId = created.id;
  }

  // 5. Insert user message
  const { error: userMsgErr } = await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: message,
  });
  if (userMsgErr) {
    console.error('Failed to insert user message:', userMsgErr);
    return new Response(JSON.stringify({ error: 'Failed to save message' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 6. Fetch history (rebuild every iteration from DB after tool exec)
  const fetchHistory = async (): Promise<LLMMessage[]> => {
    const { data } = await supabase
      .from('ai_messages')
      .select('role, content, tool_calls, tool_results')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT * 2); // tool messages podwajają liczbę wpisów
    const ordered = (data ?? []).reverse();
    return ordered.map((m) => {
      const msg: LLMMessage = {
        role: m.role as LLMMessage['role'],
        content: m.content ?? '',
      };
      if (m.tool_calls) msg.tool_calls = m.tool_calls;
      if (m.role === 'tool' && m.tool_results) {
        const tr = m.tool_results as { tool_call_id?: string; name?: string };
        if (tr.tool_call_id) msg.tool_call_id = tr.tool_call_id;
        if (tr.name) msg.name = tr.name;
      }
      return msg;
    });
  };

  const ctx: ToolContext = {
    tenantId: auth.tenantId,
    actorId: auth.directorId,
    conversationId: conversationId ?? '',
  };

  const t0 = Date.now();
  const encoder = new TextEncoder();

  // ============ STREAMING SSE RESPONSE ============
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      let lastModel = '';

      const sendEvent = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        // Sprint 06: build rich scope context once (label + summary)
        const scopeCtx = await buildScopeContext(supabase, scopeType, scopeId);

        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const history = await fetchHistory();
          const systemPrompt = buildSovraPrompt(scopeCtx);
          const llmMessages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history,
          ];

          // Non-stream call (R1: streamed tool_calls fragment poorly across providers)
          const directRaw = await directLLMCall(llmMessages, requestId, iter);
          if (!directRaw.ok) {
            sendEvent({ type: 'error', error: 'gateway_error', message: 'Błąd bramy AI.' });
            break;
          }
          const choice = directRaw.data?.choices?.[0]?.message ?? {};
          const assistantText = (choice.content as string) ?? '';
          const toolCalls = (choice.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }>) ?? [];

          lastModel = 'google/gemini-3-flash-preview';
          totalTokensIn += directRaw.data?.usage?.prompt_tokens ?? 0;
          totalTokensOut += directRaw.data?.usage?.completion_tokens ?? 0;

          // Persist assistant message (z tool_calls jeśli są)
          await supabase.from('ai_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantText,
            tool_calls: toolCalls.length > 0 ? toolCalls : null,
            model: lastModel,
            provider: 'lovable',
          });

          // Wyemituj content do FE (jako pełny tekst — nie po-chunkach, bo nie streamowaliśmy)
          if (assistantText) {
            sendEvent({
              choices: [{ delta: { content: assistantText } }],
            });
          }

          if (toolCalls.length === 0) {
            // Koniec — brak tool calls
            break;
          }

          // ====== TOOL EXECUTION ======
          let writeBreak = false;
          for (const tc of toolCalls) {
            const toolName = tc.function?.name;
            if (!toolName || !isKnownTool(toolName)) {
              await supabase.from('ai_messages').insert({
                conversation_id: conversationId,
                role: 'tool',
                content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
                tool_results: { tool_call_id: tc.id, name: toolName },
              });
              continue;
            }

            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
            } catch (e) {
              console.error('Failed to parse tool args:', tc.function.arguments, e);
            }

            if (isReadTool(toolName)) {
              const result = await executeReadTool(toolName, parsedArgs, userClient);
              const resultStr = JSON.stringify(result);
              await supabase.from('ai_messages').insert({
                conversation_id: conversationId,
                role: 'tool',
                content: resultStr,
                tool_results: { tool_call_id: tc.id, name: toolName, result },
              });
              sendEvent({ type: 'tool_result', tool: toolName, args: parsedArgs, result });
            } else {
              // WRITE / STUB — pending action
              const pending = await createPendingAction(supabase, ctx, toolName, parsedArgs);
              if ('error' in pending) {
                sendEvent({ type: 'error', error: 'pending_action_failed', message: pending.error });
                writeBreak = true;
                break;
              }
              await supabase.from('ai_messages').insert({
                conversation_id: conversationId,
                role: 'tool',
                content: JSON.stringify(pending),
                tool_results: { tool_call_id: tc.id, name: toolName, pending },
              });
              sendEvent({
                type: 'pending_action',
                pending_action_id: pending.pending_action_id,
                tool: toolName,
                human_summary: pending.human_summary,
                integration_ready: pending.integration_ready,
              });
              writeBreak = true; // zatrzymujemy pętlę po pierwszym write
              break;
            }
          }

          if (writeBreak) break;
        }
      } catch (e) {
        console.error('Sovra loop error:', e);
        captureException(e, {
          function_name: 'sovra',
          request_id: requestId,
          user_id: auth.user.id,
          tenant_id: auth.tenantId,
        });
        sendEvent({ type: 'error', error: 'internal', message: String(e) });
      } finally {
        // [DONE] sentinel
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

        // Update conversation last_message_at + log usage
        try {
          const cost = calcCostCents(lastModel || 'google/gemini-3-flash-preview', totalTokensIn, totalTokensOut);
          await supabase
            .from('ai_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId);
          logUsage({
            provider: 'lovable',
            model: lastModel,
            tokens_in: totalTokensIn,
            tokens_out: totalTokensOut,
            cost_cents: cost,
            latency_ms: Date.now() - t0,
            request_id: requestId,
            context: {
              function_name: 'sovra',
              persona: 'sovra',
              actor_id: auth.directorId,
              tenant_id: auth.tenantId,
            },
          });
        } catch (e) {
          console.error('Failed to finalize conversation:', e);
        }
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Sovra-Conversation-Id': conversationId ?? '',
    },
  });
});

// Direct (non-stream) gateway call to grab raw tool_calls (workaround for R1/R2)
async function directLLMCall(
  messages: LLMMessage[],
  requestId: string,
  iter: number,
): Promise<{ ok: boolean; data?: { choices?: Array<{ message?: Record<string, unknown> }>; usage?: { prompt_tokens?: number; completion_tokens?: number } } }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return { ok: false };
  const t0 = Date.now();
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        stream: false,
      }),
    });
    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      console.error(`directLLMCall failed iter=${iter} status=${response.status} body=${txt.slice(0, 300)}`);
      return { ok: false };
    }
    const data = await response.json();
    console.log(JSON.stringify({
      kind: 'sovra_iter',
      iter,
      request_id: requestId,
      latency_ms: Date.now() - t0,
      tokens_in: data?.usage?.prompt_tokens,
      tokens_out: data?.usage?.completion_tokens,
      tool_calls_count: (data?.choices?.[0]?.message?.tool_calls ?? []).length,
    }));
    return { ok: true, data };
  } catch (e) {
    console.error('directLLMCall exception:', e);
    return { ok: false };
  }
}

// Sprint 06: rich scope context (label + summary) for system prompt
// Awaria fetcha = wracamy do { scope_type, scope_id } bez label/summary.
async function buildScopeContext(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  scopeType: string,
  scopeId: string | null,
): Promise<ScopeContext> {
  const base: ScopeContext = { scope_type: scopeType, scope_id: scopeId };
  if (!scopeId || scopeType === 'global') return base;

  try {
    if (scopeType === 'contact') {
      const { data: c } = await supabase
        .from('contacts')
        .select('full_name, position, email, phone, company, profile_summary, companies(name)')
        .eq('id', scopeId)
        .maybeSingle();
      if (!c) return base;
      const lines: string[] = [];
      if (c.position) lines.push(`Stanowisko: ${c.position}`);
      const companyName = c.companies?.name || c.company;
      if (companyName) lines.push(`Firma: ${companyName}`);
      if (c.email) lines.push(`E-mail: ${c.email}`);
      if (c.phone) lines.push(`Telefon: ${c.phone}`);
      if (c.profile_summary) lines.push(`Profil: ${c.profile_summary}`);
      // BI 2.0 summary
      const { data: bi } = await supabase
        .from('contact_bi')
        .select('ai_summary, answers')
        .eq('contact_id', scopeId)
        .maybeSingle();
      if (bi?.ai_summary) lines.push(`BI summary: ${bi.ai_summary}`);
      if (bi?.answers && Object.keys(bi.answers as Record<string, unknown>).length > 0) {
        lines.push(`BI answers: ${JSON.stringify(bi.answers).slice(0, 800)}`);
      }
      return {
        ...base,
        scope_label: c.full_name,
        scope_summary: lines.join('\n') || null,
      };
    }
    if (scopeType === 'project') {
      const { data: p } = await supabase
        .from('projects')
        .select('name, description, status, due_date')
        .eq('id', scopeId)
        .maybeSingle();
      if (!p) return base;
      const lines: string[] = [];
      if (p.status) lines.push(`Status: ${p.status}`);
      if (p.due_date) lines.push(`Termin: ${p.due_date}`);
      if (p.description) lines.push(p.description);
      return { ...base, scope_label: p.name, scope_summary: lines.join('\n') || null };
    }
    if (scopeType === 'deal') {
      const { data: d } = await supabase
        .from('deal_team_contacts')
        .select('category, status, value_amount, contacts(full_name), deal_teams(name)')
        .eq('id', scopeId)
        .maybeSingle();
      if (!d) return base;
      const lines: string[] = [];
      if (d.deal_teams?.name) lines.push(`Zespół: ${d.deal_teams.name}`);
      if (d.category) lines.push(`Etap: ${d.category}`);
      if (d.status) lines.push(`Status: ${d.status}`);
      if (d.value_amount) lines.push(`Wartość: ${d.value_amount}`);
      const label = d.contacts?.full_name ? `Szansa: ${d.contacts.full_name}` : 'Szansa sprzedaży';
      return { ...base, scope_label: label, scope_summary: lines.join('\n') || null };
    }
    if (scopeType === 'meeting') {
      const { data: m } = await supabase
        .from('consultations')
        .select('scheduled_at, status, agenda, contacts(full_name)')
        .eq('id', scopeId)
        .maybeSingle();
      if (!m) return base;
      const lines: string[] = [];
      if (m.scheduled_at) lines.push(`Termin: ${m.scheduled_at}`);
      if (m.status) lines.push(`Status: ${m.status}`);
      if (m.agenda) lines.push(`Agenda: ${m.agenda}`);
      const label = m.contacts?.full_name ? `Spotkanie z: ${m.contacts.full_name}` : 'Spotkanie';
      return { ...base, scope_label: label, scope_summary: lines.join('\n') || null };
    }
  } catch (e) {
    console.error('buildScopeContext error:', e);
  }
  return base;
}
