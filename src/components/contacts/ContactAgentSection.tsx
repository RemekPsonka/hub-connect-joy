import { useState } from 'react';
import { Bot, RefreshCw, Send, Sparkles, AlertTriangle, Target, Heart, MessageSquare, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  useContactAgentMemory, 
  useInitializeContactAgent, 
  useQueryContactAgent,
  AgentInsight 
} from '@/hooks/useContactAgent';

interface ContactAgentSectionProps {
  contactId: string;
  contactName: string;
}

export function ContactAgentSection({ contactId, contactName }: ContactAgentSectionProps) {
  const { data: agentMemory, isLoading: isLoadingMemory } = useContactAgentMemory(contactId);
  const initializeAgent = useInitializeContactAgent();
  const { queryAgent, isLoading: isQuerying, error: queryError } = useQueryContactAgent();
  
  const [question, setQuestion] = useState('');
  const [agentResponse, setAgentResponse] = useState<{
    answer: string;
    suggested_topics?: string[];
    warnings?: string[];
    action_items?: string[];
  } | null>(null);

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

  const handleAskAgent = async () => {
    if (!question.trim()) return;
    
    const response = await queryAgent(contactId, question);
    if (response) {
      setAgentResponse({
        answer: response.answer,
        suggested_topics: response.suggested_topics,
        warnings: response.warnings,
        action_items: response.action_items
      });
      setQuestion('');
    } else if (queryError) {
      toast.error(queryError);
    }
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
            Agent AI przeanalizuje wszystkie dane o kontakcie i stworzy profil, który pomoże w przygotowaniu do spotkań i budowaniu relacji.
          </p>
        </CardContent>
      </Card>
    );
  }

  const profile = agentMemory.agent_profile || {};
  const insights = (agentMemory.insights || []) as AgentInsight[];

  return (
    <div className="space-y-4">
      {/* Agent Persona */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Agent AI: {contactName}
            </CardTitle>
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
            {/* Pain Points */}
            {profile.pain_points && profile.pain_points.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Wyzwania
                </h4>
                <div className="flex flex-wrap gap-1">
                  {profile.pain_points.map((point, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Goals */}
            {profile.goals && profile.goals.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  Cele
                </h4>
                <div className="flex flex-wrap gap-1">
                  {profile.goals.map((goal, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Zainteresowania
                </h4>
                <div className="flex flex-wrap gap-1">
                  {profile.interests.map((interest, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Communication Style */}
            {profile.communication_style && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Styl komunikacji
                </h4>
                <p className="text-sm text-muted-foreground">
                  {profile.communication_style}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((insight, i) => (
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

      {/* Ask Agent */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Zapytaj agenta</CardTitle>
          <CardDescription>
            Zadaj pytanie o ten kontakt, np. "Jak przygotować się do spotkania?"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Wpisz pytanie..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
          />
          <Button 
            onClick={handleAskAgent} 
            disabled={isQuerying || !question.trim()}
            className="w-full"
          >
            {isQuerying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Myślę...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Zapytaj
              </>
            )}
          </Button>
          
          {agentResponse && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-3">
              <p className="text-sm">{agentResponse.answer}</p>
              
              {agentResponse.warnings && agentResponse.warnings.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-destructive mb-1">⚠️ Ostrzeżenia:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {agentResponse.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              
              {agentResponse.suggested_topics && agentResponse.suggested_topics.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium mb-1">💡 Sugerowane tematy:</p>
                  <div className="flex flex-wrap gap-1">
                    {agentResponse.suggested_topics.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {agentResponse.action_items && agentResponse.action_items.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium mb-1">✅ Do zrobienia:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {agentResponse.action_items.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
