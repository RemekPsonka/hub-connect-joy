import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  Loader2, 
  Bot, 
  User,
  Sparkles,
  Network,
  Users,
  Lightbulb,
  Search,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const suggestionPrompts = [
  {
    icon: Search,
    title: 'Wyszukaj w sieci',
    prompt: 'Kto z moich kontaktów mógłby znać prezesa Tauron lub kogoś z zarządu?',
  },
  {
    icon: Target,
    title: 'Nierozwiązane potrzeby',
    prompt: 'Jakie aktywne potrzeby moich kontaktów z branży IT pozostają niezaspokojone?',
  },
  {
    icon: Users,
    title: 'Rekomendacje kontaktów',
    prompt: 'Z kim powinienem się skontaktować w tym tygodniu? Kto potrzebuje mojej uwagi?',
  },
  {
    icon: Sparkles,
    title: 'Najlepsze dopasowania',
    prompt: 'Znajdź najlepsze dopasowania między potrzebami a ofertami moich kontaktów.',
  },
  {
    icon: Network,
    title: 'Potencjalni klienci',
    prompt: 'Którzy z moich kontaktów mogliby być potencjalnymi klientami lub partnerami?',
  },
  {
    icon: Lightbulb,
    title: 'Podsumuj aktywność',
    prompt: 'Podsumuj moje ostatnie spotkania i zasugeruj działania follow-up.',
  },
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: Message) => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        messages: [...messages, userMessage],
        context: {
          includeContacts: true,
          includeNeeds: true,
          includeOffers: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 429) {
        throw new Error('Przekroczono limit zapytań. Spróbuj ponownie za chwilę.');
      }
      if (response.status === 402) {
        throw new Error('Wymagana płatność. Dodaj środki do konta.');
      }
      
      throw new Error(error.error || 'Błąd komunikacji z AI');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';

    const updateAssistant = (content: string) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
        }
        return [...prev, { role: 'assistant', content }];
      });
    };

    while (true) {
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
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            updateAssistant(assistantContent);
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
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            updateAssistant(assistantContent);
          }
        } catch { /* ignore */ }
      }
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await streamChat(userMessage);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd');
      // Remove user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          AI Network Assistant
        </h1>
        <p className="text-muted-foreground">
          Twój inteligentny asystent do zarządzania siecią kontaktów
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Witaj!</h2>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                Jestem Twoim AI asystentem do zarządzania siecią kontaktów. 
                Mogę pomóc Ci znaleźć połączenia, przygotować się do spotkań 
                i dopasować potrzeby do ofert.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl">
                {suggestionPrompts.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto py-4 px-4 justify-start text-left"
                    onClick={() => handleSend(suggestion.prompt)}
                  >
                    <suggestion.icon className="h-5 w-5 mr-3 flex-shrink-0 text-primary" />
                    <div>
                      <div className="font-medium">{suggestion.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {suggestion.prompt}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`rounded-lg px-4 py-3 max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-secondary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg px-4 py-2 bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="border-t p-4">
            <div className="flex gap-2 max-w-3xl mx-auto">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napisz wiadomość..."
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
