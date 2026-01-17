import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Target,
  Brain,
  Link2,
  Zap,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMasterAgent, MasterAgentResponse } from '@/hooks/useContactAgent';
import { MasterAgentMessage } from '@/components/ai/MasterAgentMessage';
import { classifyIntent, needsMasterAgent, getIntentDisplay, Intent } from '@/hooks/useIntentClassifier';
import { useTurboAgent, TurboAgentResult } from '@/hooks/useTurboAgent';
import { TurboAgentProgress } from '@/components/ai/TurboAgentProgress';
import { TurboAgentResult as TurboAgentResultComponent } from '@/components/ai/TurboAgentResult';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  masterResponse?: MasterAgentResponse;
  turboResult?: TurboAgentResult;
  intent?: Intent | 'turbo';
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

// Unified suggestions with intent type
const suggestions = [
  // ⚡ Fast (simple)
  {
    icon: Lightbulb,
    title: 'Szybka pomoc',
    prompt: 'Jak mogę ulepszyć follow-up z moimi kontaktami?',
    type: 'simple' as Intent,
    badge: '⚡',
  },
  {
    icon: Users,
    title: 'Rekomendacje kontaktów',
    prompt: 'Z kim powinienem się skontaktować w tym tygodniu?',
    type: 'simple' as Intent,
    badge: '⚡',
  },
  // 🧠 Deep (network/match/briefing/analysis)
  {
    icon: Link2,
    title: 'Znajdź połączenia',
    prompt: 'Kto z moich kontaktów mógłby znać prezesa Tauron?',
    type: 'network' as Intent,
    badge: '🧠',
  },
  {
    icon: Sparkles,
    title: 'Dopasuj kontakty',
    prompt: 'Kto potrzebuje usług AI a kto je oferuje w mojej sieci?',
    type: 'match' as Intent,
    badge: '🧠',
  },
  {
    icon: Brain,
    title: 'Briefing spotkania',
    prompt: 'Przygotuj mnie do spotkania z klientem z branży medycznej',
    type: 'briefing' as Intent,
    badge: '🧠',
  },
  {
    icon: Network,
    title: 'Analiza klastrów',
    prompt: 'Jakie klastry branżowe widzisz w mojej sieci? Kto jest kluczowy?',
    type: 'analysis' as Intent,
    badge: '🧠',
  },
];

// Turbo mode suggestions
const turboSuggestions = [
  {
    icon: Rocket,
    title: 'Analiza sukcesji',
    prompt: 'Kto z moich klientów może być dobrym partnerem do rozmowy o sukcesji?',
    badge: '🚀',
  },
  {
    icon: Target,
    title: 'Eksperci AI',
    prompt: 'Którzy kontakty mają głęboką ekspertyzę w AI i mogą mi pomóc?',
    badge: '🚀',
  },
  {
    icon: Users,
    title: 'Potencjalni partnerzy',
    prompt: 'Kto z mojej sieci szuka partnera biznesowego lub inwestora?',
    badge: '🚀',
  },
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<Intent | 'turbo' | null>(null);
  const [turboMode, setTurboMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { director } = useAuth();
  const { queryMasterAgent, isLoading: masterLoading } = useMasterAgent();
  const { 
    isLoading: turboLoading, 
    progress: turboProgress, 
    queryTurboAgent,
    reset: resetTurbo 
  } = useTurboAgent();

  const isAnyLoading = isLoading || masterLoading || turboLoading;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
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

    const updateAssistant = (content: string, intent: Intent) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content, intent } : m));
        }
        return [...prev, { role: 'assistant', content, intent }];
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
            updateAssistant(assistantContent, 'simple');
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
            updateAssistant(assistantContent, 'simple');
          }
        } catch { /* ignore */ }
      }
    }
  };

  const handleMasterQuery = async (messageText: string, intent: Intent) => {
    if (!director?.tenant_id) {
      toast.error('Brak dostępu do Master Agent - zaloguj się ponownie');
      return;
    }

    const queryType = intent === 'match' ? 'match' : 
                      intent === 'briefing' ? 'briefing' : 'general';
    
    const response = await queryMasterAgent(director.tenant_id, messageText, queryType);
    
    if (response) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          masterResponse: response,
          intent,
        },
      ]);
    } else {
      throw new Error('Brak odpowiedzi od Master Agent');
    }
  };

  const handleTurboQuery = async (messageText: string) => {
    if (!director?.tenant_id) {
      toast.error('Brak dostępu do Agent Turbo - zaloguj się ponownie');
      return;
    }

    const result = await queryTurboAgent(director.tenant_id, messageText);
    
    if (result) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.result.summary,
          turboResult: result,
          intent: 'turbo',
        },
      ]);
    } else {
      throw new Error('Brak odpowiedzi od Agent Turbo');
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isAnyLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    const useTurbo = turboMode;
    setTurboMode(false); // Reset turbo mode after use
    
    if (useTurbo) {
      setCurrentIntent('turbo');
    } else {
      setCurrentIntent(null);
    }

    try {
      if (useTurbo) {
        // Use Turbo Agent
        await handleTurboQuery(messageText);
      } else {
        // Step 1: Classify intent
        const { intent } = await classifyIntent(messageText);
        setCurrentIntent(intent);
        
        // Step 2: Route to appropriate handler
        if (needsMasterAgent(intent)) {
          await handleMasterQuery(messageText, intent);
        } else {
          await streamChat(userMessage);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setCurrentIntent(null);
      resetTurbo();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getLoadingMessage = () => {
    if (currentIntent === 'turbo') return '🚀 Agent Turbo pracuje...';
    if (!currentIntent) return 'Analizuję pytanie...';
    if (needsMasterAgent(currentIntent)) {
      const display = getIntentDisplay(currentIntent);
      return `${display.icon} ${display.label}...`;
    }
    return '⚡ Odpowiadam...';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - fixed at top */}
      <div className="flex-shrink-0 mb-4 bg-muted/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Inteligentny Asystent AI
            </h1>
            <p className="text-muted-foreground">
              Automatycznie dobiera najlepsze źródło wiedzy do Twojego pytania
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              Szybki chat
            </Badge>
            <Badge variant="outline" className="gap-1 border-purple-500/50 text-purple-600">
              <Brain className="h-3 w-3" />
              Master Agent
            </Badge>
            <Badge variant="outline" className="gap-1 border-orange-500/50 text-orange-600">
              <Rocket className="h-3 w-3" />
              Agent Turbo
            </Badge>
          </div>
        </div>
      </div>

      {/* Main chat area - takes remaining space */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Witaj!</h2>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                Zadaj dowolne pytanie - automatycznie dobiorę najlepsze źródło danych.
                Proste pytania obsługuję błyskawicznie ⚡, złożone analizy sieci przekazuję do Master Agent 🧠
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl mb-6">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className={`h-auto py-4 px-4 justify-start text-left ${
                      suggestion.type !== 'simple' ? 'hover:border-purple-500/50' : ''
                    }`}
                    onClick={() => handleSend(suggestion.prompt)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <suggestion.icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        suggestion.type === 'simple' ? 'text-primary' : 'text-purple-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{suggestion.title}</span>
                          <span className="text-xs">{suggestion.badge}</span>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {suggestion.prompt}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              {/* Turbo suggestions */}
              <div className="w-full max-w-4xl">
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Agent Turbo - Głęboka analiza wielu agentów</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {turboSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto py-4 px-4 justify-start text-left border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/5"
                      onClick={() => {
                        setTurboMode(true);
                        handleSend(suggestion.prompt);
                      }}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <suggestion.icon className="h-5 w-5 flex-shrink-0 mt-0.5 text-orange-500" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{suggestion.title}</span>
                            <span className="text-xs">{suggestion.badge}</span>
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {suggestion.prompt}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1">
                <div className="p-4">
                  <div className="space-y-4 max-w-3xl mx-auto" ref={scrollRef}>
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
                          message.turboResult 
                            ? 'bg-orange-500/10 text-orange-500'
                            : message.masterResponse 
                              ? 'bg-purple-500/10 text-purple-500' 
                              : 'bg-primary/10 text-primary'
                        }>
                          {message.turboResult ? (
                            <Rocket className="h-4 w-4" />
                          ) : message.masterResponse ? (
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
                      {message.role === 'assistant' && message.intent && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                          {message.intent === 'turbo' ? (
                            <>
                              <span className="text-xs">🚀</span>
                              <span className="text-xs font-medium text-orange-500">Agent Turbo</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs">
                                {getIntentDisplay(message.intent).icon}
                              </span>
                              <span className={`text-xs font-medium ${getIntentDisplay(message.intent).color}`}>
                                {getIntentDisplay(message.intent).label}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      
                      {message.role === 'assistant' ? (
                        message.turboResult ? (
                          <TurboAgentResultComponent result={message.turboResult} />
                        ) : message.masterResponse ? (
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

                {/* Turbo progress indicator */}
                {turboLoading && (
                  <div className="max-w-3xl mx-auto">
                    <TurboAgentProgress progress={turboProgress} />
                  </div>
                )}

                {isAnyLoading && !turboLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={
                        currentIntent === 'turbo'
                          ? 'bg-orange-500/10 text-orange-500'
                          : currentIntent && needsMasterAgent(currentIntent)
                            ? 'bg-purple-500/10 text-purple-500' 
                            : 'bg-primary/10 text-primary'
                      }>
                        {currentIntent === 'turbo' ? (
                          <Rocket className="h-4 w-4" />
                        ) : currentIntent && needsMasterAgent(currentIntent) ? (
                          <Brain className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg px-4 py-2 bg-muted flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {getLoadingMessage()}
                      </span>
                    </div>
                  </div>
                )}
                  </div>
                </div>
            </ScrollArea>
          )}

          {/* Input area - fixed at bottom */}
          <div className="flex-shrink-0 border-t p-4">
            <div className="flex gap-2 max-w-3xl mx-auto">
              <Button
                variant={turboMode ? "default" : "outline"}
                size="icon"
                className={`flex-shrink-0 ${turboMode ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/10'}`}
                onClick={() => setTurboMode(!turboMode)}
                title={turboMode ? 'Tryb Turbo aktywny' : 'Włącz tryb Turbo'}
              >
                <Rocket className={`h-4 w-4 ${turboMode ? 'text-white' : 'text-orange-500'}`} />
              </Button>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={turboMode 
                  ? "🚀 Tryb Turbo - zadaj pytanie wymagające głębokiej analizy wielu agentów..."
                  : "Zadaj pytanie - AI automatycznie dobierze najlepsze źródło..."
                }
                className={`min-h-[44px] max-h-32 resize-none ${turboMode ? 'border-orange-500/50' : ''}`}
                rows={1}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isAnyLoading}
                size="icon"
                className={`flex-shrink-0 ${turboMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
              >
                {isAnyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              ⚡ Proste pytania • 🧠 Sieć kontaktów • 🚀 Agent Turbo (głęboka analiza)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
