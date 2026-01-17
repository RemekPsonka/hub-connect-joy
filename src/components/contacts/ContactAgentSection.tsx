import { useState, useRef, useEffect } from 'react';
import { Bot, RefreshCw, Send, Sparkles, AlertTriangle, Target, Heart, MessageSquare, Lightbulb, Check, X, Edit3, ListTodo, FileText, User, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  useContactAgentMemory, 
  useInitializeContactAgent, 
  useQueryContactAgent,
  useExecuteAgentAction,
  AgentInsight,
  ProposedAction,
  ConversationMessage
} from '@/hooks/useContactAgent';
import { cn } from '@/lib/utils';

interface ContactAgentSectionProps {
  contactId: string;
  contactName: string;
}

export function ContactAgentSection({ contactId, contactName }: ContactAgentSectionProps) {
  const { data: agentMemory, isLoading: isLoadingMemory } = useContactAgentMemory(contactId);
  const initializeAgent = useInitializeContactAgent();
  const { queryAgent, isLoading: isQuerying, error: queryError } = useQueryContactAgent();
  const { executeAction, isLoading: isExecutingAction } = useExecuteAgentAction();
  
  const [message, setMessage] = useState('');
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [pendingActions, setPendingActions] = useState<ProposedAction[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleInitialize = async () => {
    try {
      await initializeAgent.mutateAsync(contactId);
      toast.success('Agent AI został zainicjalizowany');
    } catch (error) {
      toast.error('Błąd inicjalizacji agenta');
    }
  };

  const handleRefresh = async () => {
    try {
      await initializeAgent.mutateAsync(contactId);
      toast.success('Wiedza agenta została odświeżona');
    } catch (error) {
      toast.error('Błąd odświeżania agenta');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isQuerying) return;
    
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    
    const conversationHistory = conversation.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    const response = await queryAgent(contactId, userMessage.content, sessionId, conversationHistory);
    
    if (response) {
      setSessionId(response.session_id);
      
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        proposed_actions: response.proposed_actions
      };
      
      setConversation(prev => [...prev, assistantMessage]);
      
      if (response.proposed_actions && response.proposed_actions.length > 0) {
        setPendingActions(response.proposed_actions);
      }
    } else if (queryError) {
      toast.error(queryError);
      // Remove the user message if there was an error
      setConversation(prev => prev.filter(m => m.id !== userMessage.id));
    }
  };

  const handleExecuteAction = async (action: ProposedAction) => {
    const result = await executeAction(contactId, action, sessionId);
    
    if (result.success) {
      toast.success(`Akcja wykonana: ${getActionLabel(action.type)}`);
      setPendingActions(prev => prev.filter(a => a !== action));
      
      // Add a system message about the action
      const actionMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ Wykonano: ${getActionLabel(action.type)} - ${action.data.title || action.data.text || action.data.field || ''}`,
        timestamp: new Date()
      };
      setConversation(prev => [...prev, actionMessage]);
    } else {
      toast.error(`Błąd: ${result.error}`);
    }
  };

  const handleRejectAction = (action: ProposedAction) => {
    setPendingActions(prev => prev.filter(a => a !== action));
    toast.info('Akcja odrzucona');
  };

  const handleNewConversation = () => {
    setConversation([]);
    setPendingActions([]);
    setSessionId(crypto.randomUUID());
    inputRef.current?.focus();
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'CREATE_TASK': 'Utwórz zadanie',
      'ADD_NOTE': 'Dodaj notatkę',
      'UPDATE_PROFILE': 'Aktualizuj profil',
      'ADD_INSIGHT': 'Zapisz insight',
      'CREATE_NEED': 'Dodaj potrzebę',
      'CREATE_OFFER': 'Dodaj ofertę',
      'SCHEDULE_FOLLOWUP': 'Zaplanuj follow-up'
    };
    return labels[type] || type;
  };

  const getActionIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'CREATE_TASK': <ListTodo className="h-4 w-4" />,
      'ADD_NOTE': <FileText className="h-4 w-4" />,
      'UPDATE_PROFILE': <User className="h-4 w-4" />,
      'ADD_INSIGHT': <Lightbulb className="h-4 w-4" />,
      'CREATE_NEED': <TrendingUp className="h-4 w-4" />,
      'CREATE_OFFER': <Target className="h-4 w-4" />,
      'SCHEDULE_FOLLOWUP': <Calendar className="h-4 w-4" />
    };
    return icons[type] || <Edit3 className="h-4 w-4" />;
  };

  const getImportanceBadgeVariant = (importance: string) => {
    switch (importance) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  if (isLoadingMemory) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!agentMemory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent AI
          </CardTitle>
          <CardDescription>
            Agent nie został jeszcze zainicjalizowany dla tego kontaktu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleInitialize} 
            disabled={initializeAgent.isPending}
            className="w-full"
          >
            {initializeAgent.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Inicjalizacja...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Zainicjalizuj agenta AI
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            Agent AI przeanalizuje WSZYSTKIE dane o kontakcie (konsultacje, spotkania, potrzeby, oferty, rekomendacje, korzyści biznesowe) i stworzy profil asystenta.
          </p>
        </CardContent>
      </Card>
    );
  }

  const profile = agentMemory.agent_profile || {};
  const insights = (agentMemory.insights || []) as AgentInsight[];

  return (
    <div className="space-y-4">
      {/* Agent Profile Card - Collapsible Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Asystent: {contactName}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleNewConversation}
              >
                Nowa rozmowa
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={initializeAgent.isPending}
              >
                {initializeAgent.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <CardDescription>
            Ostatnia aktualizacja: {agentMemory.last_refresh_at 
              ? new Date(agentMemory.last_refresh_at).toLocaleDateString('pl-PL', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'nieznana'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agentMemory.agent_persona && (
            <p className="text-sm text-muted-foreground italic mb-4">
              "{agentMemory.agent_persona}"
            </p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.pain_points && profile.pain_points.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Wyzwania
                </h4>
                <div className="flex flex-wrap gap-1">
                  {profile.pain_points.slice(0, 4).map((point, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {profile.goals && profile.goals.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  Cele
                </h4>
                <div className="flex flex-wrap gap-1">
                  {profile.goals.slice(0, 4).map((goal, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {profile.key_topics && profile.key_topics.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Tematy do poruszenia
                </h4>
                <div className="flex flex-wrap gap-1">
                  {profile.key_topics.slice(0, 4).map((topic, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.business_value && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Wartość biznesowa
                </h4>
                <p className="text-sm text-muted-foreground">
                  {profile.business_value}
                </p>
              </div>
            )}
          </div>

          {profile.next_steps && profile.next_steps.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">📋 Następne kroki</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {profile.next_steps.slice(0, 3).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Card */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Insights ({insights.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.slice(0, 5).map((insight, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                  <Badge 
                    variant={getImportanceBadgeVariant(insight.importance)} 
                    className="text-xs shrink-0"
                  >
                    {insight.importance}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{insight.text}</p>
                    <p className="text-xs text-muted-foreground">Źródło: {insight.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversational Chat */}
      <Card className="flex flex-col" style={{ height: '500px' }}>
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Rozmowa z Agentem
          </CardTitle>
          <CardDescription>
            Zapytaj o ten kontakt, poproś o przygotowanie do spotkania, lub zlecaj zadania
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {conversation.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Rozpocznij rozmowę z Agentem AI</p>
                  <p className="text-xs mt-1">Np. "Jak przygotować się do spotkania?" lub "Co wiem o tej osobie?"</p>
                </div>
              )}
              
              {conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {msg.timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {msg.role === 'user' && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {isQuerying && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Pending Actions */}
          {pendingActions.length > 0 && (
            <div className="shrink-0 py-3 border-t mt-3">
              <p className="text-xs font-medium mb-2">💡 Proponowane akcje:</p>
              <div className="space-y-2">
                {pendingActions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                    {getActionIcon(action.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{getActionLabel(action.type)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {action.data.title || action.data.text || action.data.field || action.reason}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => handleExecuteAction(action)}
                        disabled={isExecutingAction}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() => handleRejectAction(action)}
                        disabled={isExecutingAction}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Input Area */}
          <div className="shrink-0 flex gap-2 pt-3 border-t mt-3">
            <Input
              ref={inputRef}
              placeholder="Wpisz wiadomość..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isQuerying}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isQuerying || !message.trim()}
              size="icon"
            >
              {isQuerying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
