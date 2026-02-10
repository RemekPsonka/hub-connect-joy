import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface StreamChatOptions {
  messages: Message[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError?: (error: Error) => void;
}

export async function streamAIChat({
  messages,
  onDelta,
  onDone,
  onError
}: StreamChatOptions): Promise<void> {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    });
    
    // Handle rate limits and payment errors
    if (response.status === 429) {
      toast({
        title: 'Przekroczono limit zapytań',
        description: 'Spróbuj ponownie za chwilę.',
        variant: 'destructive',
      });
      onError?.(new Error('Rate limit exceeded'));
      return;
    }
    
    if (response.status === 402) {
      toast({
        title: 'Wymagana płatność',
        description: 'Doładuj konto AI, aby kontynuować.',
        variant: 'destructive',
      });
      onError?.(new Error('Payment required'));
      return;
    }
    
    if (!response.ok || !response.body) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
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
          if (content) onDelta(content);
        } catch {
          // Incomplete JSON, put it back and wait for more data
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
          if (content) onDelta(content);
        } catch { /* ignore partial leftovers */ }
      }
    }
    
    onDone();
  } catch (error) {
    console.error('AI chat error:', error);
    toast({
      title: 'Błąd AI',
      description: 'Nie udało się połączyć z asystentem AI. Spróbuj ponownie.',
      variant: 'destructive',
    });
    onError?.(error instanceof Error ? error : new Error('Unknown error'));
  }
}

// Non-streaming version for simple requests
export async function invokeAIChat(messages: Message[]): Promise<string | null> {
  try {
    let result = '';
    await streamAIChat({
      messages,
      onDelta: (chunk) => { result += chunk; },
      onDone: () => {},
      onError: () => { result = ''; }
    });
    return result || null;
  } catch {
    return null;
  }
}
