import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
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
  Target,
  MessageCircle,
  Brain,
  Link2,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMasterAgent, MasterAgentResponse } from '@/hooks/useContactAgent';
import { MasterAgentMessage } from '@/components/ai/MasterAgentMessage';

type ChatMode = 'chat' | 'master';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  masterResponse?: MasterAgentResponse;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const chatSuggestions = [
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

const masterSuggestions = [
  {
    icon: Link2,
    title: 'Znajdź połączenia',
    prompt: 'Kto z moich kontaktów mógłby znać prezesa Tauron? Przeszukaj wiedzę wszystkich agentów.',
  },
  {
    icon: Sparkles,
    title: 'Synergiczne połączenia',
    prompt: 'Znajdź synergię między kontaktami z branży IT i finansowej - kto powinien się poznać?',
  },
  {
    icon: Brain,
    title: 'Briefing przed spotkaniem',
    prompt: 'Przygotuj mi briefing przed spotkaniem z klientem z branży medycznej - co wiem o tym rynku?',
  },
  {
    icon: Target,
    title: 'Dopasowanie potrzeb',
    prompt: 'Jakie potrzeby moich kontaktów mogę zaspokoić oferując usługi consulting AI?',
  },
  {
    icon: Users,
    title: 'Analiza klastrów',
    prompt: 'Jakie klastry branżowe widzisz w mojej sieci? Kto jest kluczowy w każdym z nich?',
  },
  {
    icon: Zap,
    title: 'Szybkie intros',
    prompt: 'Kto powinien poznać kogo w mojej sieci? Zaproponuj 3 najważniejsze wprowadzenia.',
  },
];

export default function AIChat() {
  const [mode, setMode] = useState<ChatMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { director } = useAuth();
  const { queryMasterAgent, isLoading: masterLoading } = useMasterAgent();

  const currentSuggestions = mode === 'chat' ? chatSuggestions : masterSuggestions;
  const isAnyLoading = isLoading || masterLoading;

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

  const handleMasterQuery = async (messageText: string) => {
    if (!director?.tenant_id) {
      toast.error('Brak dostępu do Master Agent - zaloguj się ponownie');
      return;
    }

    const response = await queryMasterAgent(director.tenant_id, messageText, 'general');
    
    if (response) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          masterResponse: response,
        },
      ]);
    } else {
      throw new Error('Brak odpowiedzi od Master Agent');
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isAnyLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (mode === 'chat') {
        await streamChat(userMessage);
      } else {
        await handleMasterQuery(messageText);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd');
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

  const handleModeChange = (value: string) => {
    if (value && (value === 'chat' || value === 'master')) {
      setMode(value);
      // Optionally clear messages when switching modes
      // setMessages([]);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {mode === 'chat' ? (
                <Bot className="h-6 w-6 text-primary" />
              ) : (
                <Brain className="h-6 w-6 text-purple-500" />
              )}
              {mode === 'chat' ? 'AI Network Assistant' : 'Master Agent'}
            </h1>
            <p className="text-muted-foreground">
              {mode === 'chat' 
                ? 'Twój inteligentny asystent do zarządzania siecią kontaktów'
                : 'Koordynator wszystkich Contact Agents - analiza całej sieci'}
            </p>
          </div>
          
          <ToggleGroup 
            type="single" 
            value={mode} 
            onValueChange={handleModeChange}
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem 
              value="chat" 
              aria-label="Chat mode"
              className="gap-2 data-[state=on]:bg-background"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="master" 
              aria-label="Master Agent mode"
              className="gap-2 data-[state=on]:bg-background data-[state=on]:text-purple-600"
            >
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Master Agent</span>
              <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] px-1.5 py-0">
                AI
              </Badge>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                mode === 'chat' ? 'bg-primary/10' : 'bg-purple-500/10'
              }`}>
                {mode === 'chat' ? (
                  <Bot className="h-8 w-8 text-primary" />
                ) : (
                  <Brain className="h-8 w-8 text-purple-500" />
                )}
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {mode === 'chat' ? 'Witaj!' : 'Master Agent gotowy'}
              </h2>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                {mode === 'chat' 
                  ? 'Jestem Twoim AI asystentem do zarządzania siecią kontaktów. Mogę pomóc Ci znaleźć połączenia, przygotować się do spotkań i dopasować potrzeby do ofert.'
                  : 'Koordynuję wiedzę wszystkich Twoich Contact Agents. Mogę przeszukać całą sieć, znajdować synergię między kontaktami i rekomendować strategiczne połączenia.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl">
                {currentSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={`h-auto py-4 px-4 justify-start text-left ${
                      mode === 'master' ? 'hover:border-purple-500/50' : ''
                    }`}
                    onClick={() => handleSend(suggestion.prompt)}
                  >
                    <suggestion.icon className={`h-5 w-5 mr-3 flex-shrink-0 ${
                      mode === 'chat' ? 'text-primary' : 'text-purple-500'
                    }`} />
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
                        <AvatarFallback className={
                          message.masterResponse 
                            ? 'bg-purple-500/10 text-purple-500' 
                            : 'bg-primary/10 text-primary'
                        }>
                          {message.masterResponse ? (
                            <Brain className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`rounded-lg px-4 py-3 max-w-[85%] ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        message.masterResponse ? (
                          <MasterAgentMessage response={message.masterResponse} />
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        )
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

                {isAnyLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={
                        mode === 'master' 
                          ? 'bg-purple-500/10 text-purple-500' 
                          : 'bg-primary/10 text-primary'
                      }>
                        {mode === 'master' ? (
                          <Brain className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg px-4 py-2 bg-muted flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {mode === 'master' ? 'Konsultacja agentów...' : 'Myślę...'}
                      </span>
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
                placeholder={mode === 'chat' 
                  ? 'Napisz wiadomość...' 
                  : 'Zapytaj Master Agent o całą sieć...'
                }
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isAnyLoading}
                size="icon"
                className={`flex-shrink-0 ${
                  mode === 'master' ? 'bg-purple-600 hover:bg-purple-700' : ''
                }`}
              >
                {isAnyLoading ? (
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
