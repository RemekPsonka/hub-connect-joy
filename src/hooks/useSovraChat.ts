import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface SovraMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseSovraChatOptions {
  contextType?: string;
  contextId?: string;
}

export function useSovraChat(options: UseSovraChatOptions = {}) {
  const [messages, setMessages] = useState<SovraMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string, ctxType?: string, ctxId?: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: SovraMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    // Add empty assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date() }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sesja wygasła — zaloguj się ponownie');
        setIsStreaming(false);
        return;
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sovra-chat`;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          context_type: ctxType || options.contextType || 'general',
          context_id: ctxId || options.contextId || undefined,
        }),
        signal: controller.signal,
      });

      // Handle errors
      if (response.status === 429) {
        toast.error('Limit wiadomości — max 10 na minutę. Spróbuj za chwilę.');
        setMessages(prev => prev.slice(0, -1)); // Remove empty assistant msg
        setIsStreaming(false);
        return;
      }

      if (response.status === 402) {
        toast.error('Wymagana płatność — doładuj kredyty AI.');
        setMessages(prev => prev.slice(0, -1));
        setIsStreaming(false);
        return;
      }

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => null);
        toast.error(errData?.error || 'Błąd komunikacji z Sovra');
        setMessages(prev => prev.slice(0, -1));
        setIsStreaming(false);
        return;
      }

      // Read session ID from header
      const newSessionId = response.headers.get('X-Sovra-Session-Id');
      if (newSessionId) {
        setSessionId(newSessionId);
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = { ...updated[lastIdx], content: currentContent };
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
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                  updated[lastIdx] = { ...updated[lastIdx], content: currentContent };
                }
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      console.error('Sovra chat error:', e);
      toast.error('Nie udało się połączyć z Sovra. Spróbuj ponownie.');
      // Remove empty assistant message on error
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, sessionId, options.contextType, options.contextId]);

  const loadSession = useCallback(async (id: string) => {
    try {
      const { data } = await supabase
        .from('sovra_sessions')
        .select('id, content')
        .eq('id', id)
        .single();

      if (!data?.content) return;

      const content = data.content as Record<string, unknown>;
      const msgs = content.messages as Array<{ role: string; content: string; timestamp?: string }> | undefined;

      if (Array.isArray(msgs)) {
        setMessages(
          msgs
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            }))
        );
        setSessionId(id);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
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
