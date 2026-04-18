import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// Sprint 05: Sovra 2.0 + tool calling
// Backend wysyła SSE z OpenAI delta + custom events: { type: 'tool_result' | 'pending_action' | 'error' }

export interface ToolAction {
  tool: string;
  success: boolean;
  result: Record<string, unknown>;
}

export interface ToolResultEvent {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface PendingActionInfo {
  pending_action_id: string;
  tool: string;
  human_summary: string;
  integration_ready: boolean;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'failed';
}

export interface SovraMessage {
  role: 'user' | 'assistant' | 'tool_results';
  content: string;
  timestamp: Date;
  actions?: ToolAction[];
  tool_results?: ToolResultEvent[];
  pending_action?: PendingActionInfo;
}

interface UseSovraChatOptions {
  contextType?: string;
  contextId?: string;
}

export function useSovraChat(options: UseSovraChatOptions = {}) {
  const [messages, setMessages] = useState<SovraMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<'unavailable' | null>(null);
  const lastSentRef = useRef<{ text: string; ctxType?: string; ctxId?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(
    async (text: string, ctxType?: string, ctxId?: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: SovraMessage = { role: 'user', content: text, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '', timestamp: new Date() }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error('Sesja wygasła — zaloguj się ponownie');
          setIsStreaming(false);
          return;
        }

        const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sovra`;
        const response = await fetch(URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            conversation_id: sessionId,
            message: text,
            scope_type: ctxType || options.contextType || 'global',
            scope_id: ctxId || options.contextId || null,
          }),
          signal: controller.signal,
        });

        if (response.status === 429) {
          toast.error('Limit wiadomości — spróbuj za chwilę.');
          setMessages((prev) => prev.slice(0, -1));
          setIsStreaming(false);
          return;
        }
        if (response.status === 402) {
          toast.error('Wymagana płatność — doładuj kredyty AI.');
          setMessages((prev) => prev.slice(0, -1));
          setIsStreaming(false);
          return;
        }
        if (!response.ok || !response.body) {
          const err = await response.json().catch(() => null);
          toast.error(err?.error || 'Błąd komunikacji z Sovra');
          setMessages((prev) => prev.slice(0, -1));
          setIsStreaming(false);
          return;
        }

        const newConversationId = response.headers.get('X-Sovra-Conversation-Id');
        if (newConversationId) setSessionId(newConversationId);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';
        let assistantContent = '';
        let streamDone = false;

        const handleEvent = (parsed: Record<string, unknown>) => {
          // Custom events
          const type = parsed.type as string | undefined;
          if (type === 'tool_result') {
            const ev: ToolResultEvent = {
              tool: String(parsed.tool ?? ''),
              args: (parsed.args as Record<string, unknown>) ?? {},
              result: parsed.result,
            };
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              // Append do ostatniej assistant bańki jako tool_results
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  tool_results: [...(last.tool_results ?? []), ev],
                };
              }
              return updated;
            });
            return;
          }
          if (type === 'pending_action') {
            const pa: PendingActionInfo = {
              pending_action_id: String(parsed.pending_action_id),
              tool: String(parsed.tool),
              human_summary: String(parsed.human_summary ?? ''),
              integration_ready: parsed.integration_ready !== false,
              status: 'pending',
            };
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, pending_action: pa };
              }
              return updated;
            });
            return;
          }
          if (type === 'error') {
            toast.error(String(parsed.message ?? 'Błąd Sovry'));
            return;
          }

          // OpenAI-format delta
          const content = (parsed as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            const current = assistantContent;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated.length - 1;
              if (last >= 0 && updated[last].role === 'assistant') {
                updated[last] = { ...updated[last], content: current };
              }
              return updated;
            });
          }
        };

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, nl);
            textBuffer = textBuffer.slice(nl + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const json = line.slice(6).trim();
            if (json === '[DONE]') {
              streamDone = true;
              break;
            }
            try {
              const parsed = JSON.parse(json);
              handleEvent(parsed);
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }

        queryClient.invalidateQueries({ queryKey: ['sovra-sessions'] });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        console.error('Sovra chat error:', e);
        toast.error('Nie udało się połączyć z Sovrą.');
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1);
          return prev;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, sessionId, options.contextType, options.contextId, queryClient],
  );

  const confirmAction = useCallback(
    async (pendingActionId: string, decision: 'confirm' | 'cancel') => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error('Sesja wygasła');
          return false;
        }
        const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sovra-confirm`;
        const res = await fetch(URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ pending_action_id: pendingActionId, decision }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(json?.error || 'Nie udało się przetworzyć akcji');
          return false;
        }
        const newStatus: PendingActionInfo['status'] = decision === 'cancel' ? 'cancelled' : 'confirmed';
        // Update pending_action status w wiadomościach
        setMessages((prev) =>
          prev.map((m) =>
            m.pending_action?.pending_action_id === pendingActionId
              ? { ...m, pending_action: { ...m.pending_action, status: newStatus } }
              : m,
          ),
        );
        toast.success(decision === 'confirm' ? 'Wykonano' : 'Anulowano');
        return true;
      } catch (e) {
        console.error('confirmAction error:', e);
        toast.error('Błąd potwierdzenia akcji');
        return false;
      }
    },
    [],
  );

  const loadSession = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('role, content, created_at, tool_results')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loaded: SovraMessage[] = (data || [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at),
        }));

      setMessages(loaded);
      setSessionId(id);
    } catch (e) {
      console.error('Failed to load conversation:', e);
      toast.error('Nie udało się załadować rozmowy');
    }
  }, []);

  const newSession = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setSessionId(null);
    setIsStreaming(false);
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    sessionId,
    sendMessage,
    confirmAction,
    loadSession,
    newSession,
    stopStreaming,
  };
}
