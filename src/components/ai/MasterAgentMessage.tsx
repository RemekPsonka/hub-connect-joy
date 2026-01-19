import { MasterAgentResponse, SuggestedAction } from '@/hooks/useContactAgent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import { 
  Brain, 
  Users, 
  Lightbulb, 
  Building2,
  Sparkles,
  Bot,
  ExternalLink,
  ListTodo,
  StickyNote,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';

interface MasterAgentMessageProps {
  response: MasterAgentResponse;
}

export function MasterAgentMessage({ response }: MasterAgentMessageProps) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleSuggestedAction = async (action: SuggestedAction, index: number) => {
    if (!tenantId) return;
    
    const actionKey = `${action.type}-${index}`;
    setLoadingAction(actionKey);
    
    try {
      if (action.type === 'CREATE_TASK') {
        const { error } = await supabase.from('tasks').insert({
          contact_id: action.contact_id,
          title: action.title || 'Nowe zadanie',
          description: action.description || '',
          priority: 'medium',
          status: 'todo',
          tenant_id: tenantId
        });
        
        if (error) throw error;
        toast.success(`Utworzono zadanie dla ${action.contact_name}`);
      } else if (action.type === 'ADD_NOTE') {
        // First get existing notes
        const { data: contact, error: fetchError } = await supabase
          .from('contacts')
          .select('notes')
          .eq('id', action.contact_id)
          .single();
        
        if (fetchError) throw fetchError;
        
        const timestamp = new Date().toLocaleDateString('pl-PL');
        const newNote = `\n\n[${timestamp}] ${action.note}`;
        const updatedNotes = (contact?.notes || '') + newNote;
        
        const { error: updateError } = await supabase
          .from('contacts')
          .update({ notes: updatedNotes })
          .eq('id', action.contact_id);
        
        if (updateError) throw updateError;
        toast.success(`Dodano notatkę do ${action.contact_name}`);
      }
    } catch (err) {
      console.error('Action error:', err);
      toast.error('Nie udało się wykonać akcji');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Answer */}
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2">
        <ReactMarkdown>{response.answer}</ReactMarkdown>
      </div>

      {/* ============= CONTACTS WITH ACTIVE AGENTS (Priority - Full Response) ============= */}
      {response.contacts_with_agents && response.contacts_with_agents.length > 0 && (
        <Card className="bg-green-500/5 border-green-500/30">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4 text-green-500" />
              Kontakty z aktywnym agentem AI ({response.contacts_with_agents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-3">
            {response.contacts_with_agents.map((contact) => (
              <div 
                key={contact.contact_id}
                className="p-3 rounded-lg bg-background border border-green-500/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <a 
                    href={`/contacts/${contact.contact_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-2"
                  >
                    {contact.contact_name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {contact.company && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {contact.company}
                    </span>
                  )}
                </div>
                
                {/* Full agent response */}
                <div className="p-2 bg-green-500/10 rounded-md text-sm border border-green-500/20">
                  <div className="flex items-start gap-2">
                    <Bot className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <p className="text-foreground">{contact.agent_answer}</p>
                  </div>
                </div>
                
                <Badge variant="outline" className="text-xs">
                  Dopasowanie: {Math.round(contact.semantic_score * 100)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ============= CONTACTS WITHOUT AGENTS (Lower Priority - Contact to Learn More) ============= */}
      {response.contacts_without_agents && response.contacts_without_agents.length > 0 && (
        <Card className="bg-muted/50 border-muted">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Inne dopasowane kontakty ({response.contacts_without_agents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {response.contacts_without_agents.map((contact) => (
              <div 
                key={contact.contact_id}
                className="p-3 rounded-lg bg-background border space-y-2"
              >
                <div className="flex items-center justify-between">
                  <a 
                    href={`/contacts/${contact.contact_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-2"
                  >
                    {contact.contact_name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {contact.company && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {contact.company}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">{contact.match_reason}</p>
                
                {/* Info about no active agent */}
                <div className="p-2 bg-yellow-500/10 rounded-md text-sm border border-yellow-500/20">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                    <MessageSquare className="h-4 w-4" />
                    <span>Skontaktuj się, aby dowiedzieć się więcej</span>
                  </div>
                </div>
                
                <Badge variant="outline" className="text-xs">
                  Dopasowanie: {Math.round(contact.semantic_score * 100)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legacy: Related Contacts (fallback if new structure not available) */}
      {(!response.contacts_with_agents || response.contacts_with_agents.length === 0) && 
       (!response.contacts_without_agents || response.contacts_without_agents.length === 0) &&
       response.related_contacts && response.related_contacts.length > 0 && (
        <Card className="bg-muted/50 border-muted">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Powiązane kontakty ({response.related_contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {response.related_contacts.map((contact) => (
              <a
                key={contact.contact_id}
                href={`/contacts/${contact.contact_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors group"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{contact.name}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {contact.company && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.relevance}
                  </p>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ============= SUGGESTED ACTIONS ============= */}
      {response.suggested_actions && response.suggested_actions.length > 0 && (
        <Card className="bg-blue-500/5 border-blue-500/30">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              Sugerowane akcje
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="flex flex-wrap gap-2">
              {response.suggested_actions.map((action, idx) => {
                const actionKey = `${action.type}-${idx}`;
                const isLoading = loadingAction === actionKey;
                
                return (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => handleSuggestedAction(action, idx)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : action.type === 'CREATE_TASK' ? (
                      <ListTodo className="h-3 w-3" />
                    ) : (
                      <StickyNote className="h-3 w-3" />
                    )}
                    {action.type === 'CREATE_TASK' 
                      ? `Zadanie: ${action.contact_name}`
                      : `Notatka: ${action.contact_name}`
                    }
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {response.recommendations && response.recommendations.length > 0 && (
        <Card className="bg-muted/50 border-muted">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Rekomendacje ({response.recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {response.recommendations.map((rec, idx) => (
              <div 
                key={idx}
                className="p-2 rounded-md bg-background border space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{rec.action}</span>
                  <Badge 
                    variant={rec.confidence >= 0.7 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {Math.round(rec.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{rec.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Potential Matches */}
      {response.potential_matches && response.potential_matches.length > 0 && (
        <Card className="bg-muted/50 border-muted">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Potencjalne dopasowania ({response.potential_matches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {response.potential_matches.map((match, idx) => (
              <div 
                key={idx}
                className="p-2 rounded-md bg-background border"
              >
                <div className="flex items-center gap-2 mb-1">
                  <a 
                    href={`/contacts/${match.contact_a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {match.contact_a.name}
                  </a>
                  <span className="text-muted-foreground">↔</span>
                  <a 
                    href={`/contacts/${match.contact_b.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {match.contact_b.name}
                  </a>
                  <Badge 
                    variant={match.confidence >= 0.7 ? "default" : "secondary"}
                    className="ml-auto text-xs"
                  >
                    {Math.round(match.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{match.match_reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Meta info */}
      {response.agents_consulted && response.agents_consulted.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Brain className="h-3 w-3" />
          <span>
            Skonsultowano {response.agents_consulted.length} agentów z {response.total_agents} dostępnych
          </span>
        </div>
      )}
    </div>
  );
}
