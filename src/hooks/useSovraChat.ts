import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// Sprint 04: Sovra 2.0 — endpoint `sovra` + ai_conversations/ai_messages.
// Tool actions / tool_results zostają w typach (kompatybilność z SovraMessages),
// ale w S04 stream nie emituje tool_results — backend nie wykonuje narzędzi (S05).

export interface ToolAction {
  tool: string;
  success: boolean;
  result: Record<string, unknown>;
}

export interface SovraMessage {
  role: 'user' | 'assistant' | 'tool_results';
  content: string;
  timestamp: Date;
  actions?: ToolAction[];
}

interface UseSovraChatOptions {
  contextType?: string;
  contextId?: string;
}

export function useSovraChat(options: UseSovraChatOptions = {}) {
  const [messages, setMessages] = useState<SovraMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // sessionId trzymane dla zewnętrznych konsumentów (Sovra.tsx invaliduje sesje przy zmianie)
  const [sessionId, setSessionId] = useState<string | null>(null);
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
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
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
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }

        // Final flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split('\n')) {
            if (!raw) continue;
            if (raw.endsWith('\r')) raw = raw.slice(0, -1);
            if (raw.startsWith(':') || raw.trim() === '') continue;
            if (!raw.startsWith('data: ')) continue;
            const json = raw.slice(6).trim();
            if (json === '[DONE]') continue;
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
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
            } catch {
              /* ignore */
            }
          }
        }

        // Refresh sessions list (sidebar)
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

  const loadSession = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('role, content, created_at')
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
    loadSession,
    newSession,
    stopStreaming,
  };
}
