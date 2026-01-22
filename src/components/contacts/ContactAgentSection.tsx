import { useState, useRef, useEffect } from 'react';
import { Bot, RefreshCw, Send, Sparkles, AlertTriangle, Target, Heart, MessageSquare, Lightbulb, Check, X, Edit3, ListTodo, FileText, User, TrendingUp, Calendar, ChevronDown, ChevronUp, Building, ThumbsUp, ThumbsDown, Briefcase, Users, Zap, Shield, FileDown } from 'lucide-react';
import { exportAgentProfileToPDF } from '@/utils/exportAgentProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

// Type definitions for detailed profile data
interface PersonProfile {
  summary?: string;
  role_in_company?: string;
  decision_making_style?: string;
  communication_preferences?: string;
}

interface ChallengeDetailed {
  challenge: string;
  context?: string;
  why_it_matters?: string;
  potential_approach?: string;
}

interface GoalDetailed {
  goal: string;
  timeline?: string;
  priority?: string;
  context?: string;
  how_we_can_help?: string;
}

interface TopicToDiscuss {
  topic: string;
  why_relevant?: string;
  suggested_angle?: string;
}

interface BusinessValueDetailed {
  summary?: string;
  strategic_importance?: string;
  potential_deal_size?: string;
  risks?: string;
}

interface CompanyContext {
  key_facts?: string;
  current_situation?: string;
  products_services_relevant?: string;
  opportunities?: string;
}

interface MeetingBrief {
  one_liner?: string;
  what_to_know?: string[];
  do?: string[];
  dont?: string[];
  opening_topics?: string[];
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
  const [expandedSections, setExpandedSections] = useState({
    person: true,
    challenges: false,
    goals: false,
    topics: false,
    company: false,
    value: false
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
      setConversation(prev => prev.filter(m => m.id !== userMessage.id));
    }
  };

  const handleExecuteAction = async (action: ProposedAction) => {
    const result = await executeAction(contactId, action, sessionId);
    
    if (result.success) {
      toast.success(`Akcja wykonana: ${getActionLabel(action.type)}`);
      setPendingActions(prev => prev.filter(a => a !== action));
      
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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-muted-foreground bg-muted';
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
            Agent AI przeanalizuje WSZYSTKIE dane o kontakcie i firmie, wygeneruje szczegółowy profil i przygotuje brief pod spotkanie.
          </p>
        </CardContent>
      </Card>
    );
  }

  const profile = (agentMemory.agent_profile || {}) as Record<string, any>;
  const insights = (agentMemory.insights || []) as AgentInsight[];
  
  // Extract new detailed data - using any since these are dynamically generated
  const personProfile = profile.person_profile as PersonProfile | undefined;
  const challengesDetailed = (profile.challenges_detailed || []) as ChallengeDetailed[];
  const goalsDetailed = (profile.goals_detailed || []) as GoalDetailed[];
  const topicsToDiscuss = (profile.topics_to_discuss || []) as TopicToDiscuss[];
  const businessValueDetailed = profile.business_value_detailed as BusinessValueDetailed | undefined;
  const companyContext = profile.company_context as CompanyContext | undefined;
  const meetingBrief = profile.meeting_brief as MeetingBrief | undefined;

  return (
    <div className="space-y-4">
      {/* 🎯 MEETING BRIEF - Najważniejsza sekcja na górze */}
      {meetingBrief && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Zap className="h-5 w-5" />
              Brief pod spotkanie
            </CardTitle>
            {meetingBrief.one_liner && (
              <p className="text-lg font-semibold text-foreground mt-2">
                💡 {meetingBrief.one_liner}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* What to know */}
            {meetingBrief.what_to_know && meetingBrief.what_to_know.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Co musisz wiedzieć
                </h4>
                <ul className="space-y-1.5">
                  {meetingBrief.what_to_know.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DO */}
              {meetingBrief.do && meetingBrief.do.length > 0 && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                    <ThumbsUp className="h-4 w-4" />
                    TAK - Rób to
                  </h4>
                  <ul className="space-y-1.5">
                    {meetingBrief.do.map((item, i) => (
                      <li key={i} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                        <Check className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* DON'T */}
              {meetingBrief.dont && meetingBrief.dont.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-700 dark:text-red-400">
                    <ThumbsDown className="h-4 w-4" />
                    NIE - Unikaj tego
                  </h4>
                  <ul className="space-y-1.5">
                    {meetingBrief.dont.map((item, i) => (
                      <li key={i} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                        <X className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Opening topics */}
            {meetingBrief.opening_topics && meetingBrief.opening_topics.length > 0 && (
              <div className="pt-2 border-t">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Tematy na otwarcie rozmowy
                </h4>
                <div className="flex flex-wrap gap-2">
                  {meetingBrief.opening_topics.map((topic, i) => (
                    <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agent Header + Persona */}
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
                onClick={() => exportAgentProfileToPDF({
                  contactName,
                  agentPersona: agentMemory.agent_persona || undefined,
                  lastRefreshAt: agentMemory.last_refresh_at || undefined,
                  meetingBrief,
                  personProfile,
                  challengesDetailed,
                  goalsDetailed,
                  topicsToDiscuss,
                  companyContext,
                  businessValueDetailed,
                  insights
                })}
                className="gap-1"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
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
            <p className="text-sm text-muted-foreground italic border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r">
              {agentMemory.agent_persona}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 👤 PERSON PROFILE - Collapsible */}
      {personProfile && (personProfile.summary || personProfile.role_in_company) && (
        <Collapsible open={expandedSections.person} onOpenChange={() => toggleSection('person')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    Profil osoby
                  </CardTitle>
                  {expandedSections.person ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {personProfile.summary && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Kim jest</h4>
                    <p className="text-sm">{personProfile.summary}</p>
                  </div>
                )}
                {personProfile.role_in_company && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Rola w firmie</h4>
                    <p className="text-sm">{personProfile.role_in_company}</p>
                  </div>
                )}
                {personProfile.decision_making_style && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Styl podejmowania decyzji</h4>
                    <p className="text-sm">{personProfile.decision_making_style}</p>
                  </div>
                )}
                {personProfile.communication_preferences && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Preferencje komunikacji</h4>
                    <p className="text-sm">{personProfile.communication_preferences}</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* ⚠️ CHALLENGES DETAILED - Collapsible */}
      {challengesDetailed.length > 0 && (
        <Collapsible open={expandedSections.challenges} onOpenChange={() => toggleSection('challenges')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Wyzwania ({challengesDetailed.length})
                  </CardTitle>
                  {expandedSections.challenges ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {challengesDetailed.map((challenge, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card">
                    <h4 className="font-medium text-sm mb-2">{challenge.challenge}</h4>
                    {challenge.context && (
                      <p className="text-sm text-muted-foreground mb-2">{challenge.context}</p>
                    )}
                    {challenge.why_it_matters && (
                      <div className="text-sm">
                        <span className="font-medium text-amber-600">Dlaczego ważne: </span>
                        {challenge.why_it_matters}
                      </div>
                    )}
                    {challenge.potential_approach && (
                      <div className="text-sm mt-2 p-2 bg-primary/5 rounded border-l-2 border-primary">
                        <span className="font-medium text-primary">Jak pomóc: </span>
                        {challenge.potential_approach}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 🎯 GOALS DETAILED - Collapsible */}
      {goalsDetailed.length > 0 && (
        <Collapsible open={expandedSections.goals} onOpenChange={() => toggleSection('goals')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Cele ({goalsDetailed.length})
                  </CardTitle>
                  {expandedSections.goals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {goalsDetailed.map((goal, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm">{goal.goal}</h4>
                      <div className="flex gap-1 shrink-0">
                        {goal.priority && (
                          <Badge className={cn("text-xs", getPriorityColor(goal.priority))}>
                            {goal.priority === 'high' ? 'Wysoki' : goal.priority === 'medium' ? 'Średni' : 'Niski'}
                          </Badge>
                        )}
                        {goal.timeline && (
                          <Badge variant="outline" className="text-xs">
                            {goal.timeline === 'short' ? 'Krótki' : goal.timeline === 'medium' ? 'Średni' : 'Długi'} termin
                          </Badge>
                        )}
                      </div>
                    </div>
                    {goal.context && (
                      <p className="text-sm text-muted-foreground mb-2">{goal.context}</p>
                    )}
                    {goal.how_we_can_help && (
                      <div className="text-sm mt-2 p-2 bg-primary/5 rounded border-l-2 border-primary">
                        <span className="font-medium text-primary">Jak wesprzeć: </span>
                        {goal.how_we_can_help}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 💬 TOPICS TO DISCUSS - Collapsible */}
      {topicsToDiscuss.length > 0 && (
        <Collapsible open={expandedSections.topics} onOpenChange={() => toggleSection('topics')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    Tematy do rozmowy ({topicsToDiscuss.length})
                  </CardTitle>
                  {expandedSections.topics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {topicsToDiscuss.map((topic, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card">
                    <h4 className="font-medium text-sm mb-1">{topic.topic}</h4>
                    {topic.why_relevant && (
                      <p className="text-sm text-muted-foreground mb-1">{topic.why_relevant}</p>
                    )}
                    {topic.suggested_angle && (
                      <p className="text-sm text-primary/80 italic">
                        💡 {topic.suggested_angle}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 🏢 COMPANY CONTEXT - Collapsible */}
      {companyContext && (companyContext.key_facts || companyContext.current_situation) && (
        <Collapsible open={expandedSections.company} onOpenChange={() => toggleSection('company')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4 text-amber-500" />
                    Kontekst firmy
                  </CardTitle>
                  {expandedSections.company ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {companyContext.key_facts && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Kluczowe fakty</h4>
                    <p className="text-sm">{companyContext.key_facts}</p>
                  </div>
                )}
                {companyContext.current_situation && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Aktualna sytuacja</h4>
                    <p className="text-sm">{companyContext.current_situation}</p>
                  </div>
                )}
                {companyContext.products_services_relevant && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Produkty/usługi istotne dla nas</h4>
                    <p className="text-sm">{companyContext.products_services_relevant}</p>
                  </div>
                )}
                {companyContext.opportunities && (
                  <div className="p-2 bg-primary/5 rounded border-l-2 border-primary">
                    <h4 className="text-sm font-medium text-primary mb-1">Możliwości współpracy</h4>
                    <p className="text-sm">{companyContext.opportunities}</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 📈 BUSINESS VALUE - Collapsible */}
      {businessValueDetailed && businessValueDetailed.summary && (
        <Collapsible open={expandedSections.value} onOpenChange={() => toggleSection('value')}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Wartość biznesowa
                  </CardTitle>
                  {expandedSections.value ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                <p className="text-sm">{businessValueDetailed.summary}</p>
                {businessValueDetailed.strategic_importance && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Znaczenie strategiczne</h4>
                    <p className="text-sm">{businessValueDetailed.strategic_importance}</p>
                  </div>
                )}
                {businessValueDetailed.potential_deal_size && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Potencjalna skala</h4>
                    <p className="text-sm">{businessValueDetailed.potential_deal_size}</p>
                  </div>
                )}
                {businessValueDetailed.risks && (
                  <div className="p-2 bg-destructive/5 rounded border-l-2 border-destructive">
                    <h4 className="text-sm font-medium text-destructive mb-1 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Ryzyka
                    </h4>
                    <p className="text-sm">{businessValueDetailed.risks}</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Next Steps */}
      {profile.next_steps && profile.next_steps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📋 Następne kroki</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {profile.next_steps.slice(0, 5).map((step: string, i: number) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Insights Card */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Insights ({insights.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {insights.slice(0, 5).map((insight, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-start gap-2">
                    <Badge 
                      variant={getImportanceBadgeVariant(insight.importance)} 
                      className="text-xs shrink-0"
                    >
                      {insight.importance === 'high' ? 'Ważne' : insight.importance === 'medium' ? 'Średnie' : 'Info'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{insight.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">Źródło: {insight.source}</p>
                    </div>
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