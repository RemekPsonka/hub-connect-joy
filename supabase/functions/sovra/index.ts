// Sprint 04 — Sovra 2.0 chat endpoint (streaming)
// POST /sovra { conversation_id?, message, scope_type?, scope_id? }
// → SSE stream + nagłówek X-Sovra-Conversation-Id

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { callLLM, calcCostCents, logUsage, type LLMMessage } from '../_shared/llm-provider.ts';
import { buildSovraPrompt, type ScopeContext } from '../_shared/prompts/sovra.v1.ts';

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

const HISTORY_LIMIT = 20;

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
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1. Auth
  const auth = await verifyAuth(req, supabase);
  if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
  if (auth.userType !== 'director' || !auth.directorId) {
    return new Response(JSON.stringify({ error: 'Sovra is available only for directors' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Rate limit (30 req/60s per user)
  const rl = await checkRateLimit(`sovra:${auth.user.id}`, { max: 30, window: 60 });
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Parse + validate body
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

  // 4. Get or create conversation
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

  // 6. Fetch last N messages
  const { data: history } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  const ordered = (history ?? []).reverse();

  // 7. Build prompt (TODO S05: scope context fetch z DB; teraz tylko persona)
  const scopeCtx: ScopeContext = { scope_type: scopeType, scope_id: scopeId };
  const systemPrompt = buildSovraPrompt(scopeCtx);

  const llmMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...ordered.map((m) => ({
      role: m.role as LLMMessage['role'],
      content: m.content,
    })),
  ];

  // 8. Call LLM (streaming)
  const t0 = Date.now();
  let llm;
  try {
    llm = await callLLM({ messages: llmMessages, stream: true, request_id: requestId });
  } catch (e) {
    console.error('LLM call failed:', e);
    return new Response(JSON.stringify({ error: 'LLM call failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (llm.status === 429) {
    return new Response(JSON.stringify({ error: 'AI rate limit, try again shortly' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (llm.status === 402) {
    return new Response(JSON.stringify({ error: 'AI credits required' }), {
      status: 402,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (llm.status !== 200 || !llm.stream) {
    return new Response(JSON.stringify({ error: 'AI gateway error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 9. Pipe-through stream + capture content for persistence
  const reader = llm.stream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let assistantContent = '';
  let textBuffer = '';
  let usageTokensIn: number | undefined;
  let usageTokensOut: number | undefined;

  const passthrough = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
          textBuffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, nl);
            textBuffer = textBuffer.slice(nl + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (json === '[DONE]') continue;
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) assistantContent += content;
              if (parsed.usage) {
                usageTokensIn = parsed.usage.prompt_tokens ?? usageTokensIn;
                usageTokensOut = parsed.usage.completion_tokens ?? usageTokensOut;
              }
            } catch {
              // partial JSON — re-buffer
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      } catch (e) {
        console.error('Stream pipe error:', e);
      } finally {
        controller.close();

        // Persist assistant message + cost
        try {
          const tokens_in = usageTokensIn ?? 0;
          const tokens_out = usageTokensOut ?? 0;
          const cost_cents = calcCostCents(llm.model, tokens_in, tokens_out);

          await supabase.from('ai_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantContent,
            model: llm.model,
            provider: 'lovable',
            tokens_in: tokens_in || null,
            tokens_out: tokens_out || null,
            cost_cents: cost_cents || null,
          });

          await supabase
            .from('ai_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId);

          logUsage({
            provider: 'lovable',
            model: llm.model,
            tokens_in,
            tokens_out,
            cost_cents,
            latency_ms: Date.now() - t0,
            request_id: requestId,
          });
        } catch (e) {
          console.error('Failed to persist assistant message:', e);
        }
      }
    },
  });

  return new Response(passthrough, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Sovra-Conversation-Id': conversationId,
    },
  });
});
