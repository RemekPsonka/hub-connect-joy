import { MasterAgentResponse, SuggestedAction, ContactWithAgent, ContactWithoutAgent } from '@/hooks/useContactAgent';
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
  Loader2,
  CalendarPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';
import { TaskModal } from '@/components/tasks/TaskModal';

interface MasterAgentMessageProps {
  response: MasterAgentResponse;
}

// Helper to get initials from name
const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

// Parse contacts from markdown answer as fallback
const parseContactsFromAnswer = (answer: string): Array<{name: string; company: string}> => {
  const contacts: Array<{name: string; company: string}> = [];
  // Pattern: **Name** (Firma: Company...)
  const regex = /\*\*([^*]+)\*\*\s*\(Firma:\s*([^,)]+)/g;
  let match;
  while ((match = regex.exec(answer)) !== null) {
    contacts.push({ name: match[1].trim(), company: match[2].trim() });
  }
  return contacts;
};

export function MasterAgentMessage({ response }: MasterAgentMessageProps) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedContactForTask, setSelectedContactForTask] = useState<{
    id: string;
    name: string;
    company?: string;
  } | null>(null);

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

  const openTaskModal = (contact: ContactWithAgent | ContactWithoutAgent) => {
    setSelectedContactForTask({
      id: contact.contact_id,
      name: contact.contact_name,
      company: contact.company || undefined
    });
    setTaskModalOpen(true);
  };

  // Check if we have structured contacts
  const hasStructuredContacts = 
    (response.contacts_with_agents?.length || 0) + 
    (response.contacts_without_agents?.length || 0) > 0;

  // Fallback: parse contacts from markdown if no structured data
  const parsedContacts = !hasStructuredContacts ? parseContactsFromAnswer(response.answer) : [];

  return (
    <div className="space-y-4">
      {/* Main Answer - only show if no structured contacts OR as intro */}
      {(!hasStructuredContacts || response.answer.length < 500) && (
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2">
          <ReactMarkdown>{response.answer}</ReactMarkdown>
        </div>
      )}

      {/* ============= CONTACTS WITH ACTIVE AGENTS (Modern Card Design) ============= */}
      {response.contacts_with_agents && response.contacts_with_agents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
            <Bot className="h-4 w-4" />
            <span>Kontakty z aktywnym agentem AI ({response.contacts_with_agents.length})</span>
          </div>
          
          <div className="grid gap-3">
            {response.contacts_with_agents.map((contact) => (
              <Card 
                key={contact.contact_id} 
                className="border border-green-500/30 bg-green-500/5 hover:border-green-500/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Avatar + Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-green-500/20 text-green-700 dark:text-green-300 text-sm font-medium">
                          {getInitials(contact.contact_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <a 
                          href={`/contacts/${contact.contact_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-foreground hover:text-primary hover:underline flex items-center gap-1.5 truncate"
                        >
                          {contact.contact_name}
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                        </a>
                        {contact.company && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            {contact.company}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => openTaskModal(contact)}
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                        Dodaj zadanie
                      </Button>
                    </div>
                  </div>
                  
                  {/* Agent response */}
                  {contact.agent_answer && (
                    <div className="mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-start gap-2">
                        <Bot className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-foreground">{contact.agent_answer}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Match badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">
                      {Math.round(contact.semantic_score * 100)}% dopasowania
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============= CONTACTS WITHOUT AGENTS (Modern Card Design) ============= */}
      {response.contacts_without_agents && response.contacts_without_agents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Inne dopasowane kontakty ({response.contacts_without_agents.length})</span>
          </div>
          
          <div className="grid gap-3">
            {response.contacts_without_agents.map((contact) => (
              <Card 
                key={contact.contact_id} 
                className="border border-border/50 hover:border-primary/30 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Avatar + Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getInitials(contact.contact_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <a 
                          href={`/contacts/${contact.contact_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-foreground hover:text-primary hover:underline flex items-center gap-1.5 truncate"
                        >
                          {contact.contact_name}
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                        </a>
                        {contact.company && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                            <Building2 className="h-3 w-3 flex-shrink-0" />
                            {contact.company}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => openTaskModal(contact)}
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                        Dodaj zadanie
                      </Button>
                    </div>
                  </div>
                  
                  {/* Match reason */}
                  <p className="mt-2 text-sm text-muted-foreground">{contact.match_reason}</p>
                  
                  {/* Info about no active agent */}
                  <div className="mt-3 p-2 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Skontaktuj się, aby dowiedzieć się więcej</span>
                    </div>
                  </div>
                  
                  {/* Match badge */}
                  <div className="mt-3">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(contact.semantic_score * 100)}% dopasowania
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============= FALLBACK: Parsed Contacts from Markdown ============= */}
      {!hasStructuredContacts && parsedContacts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Znalezione kontakty ({parsedContacts.length})</span>
          </div>
          
          <div className="grid gap-2">
            {parsedContacts.map((contact, idx) => (
              <Card key={idx} className="border border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contact.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Legacy: Related Contacts (fallback if new structure not available) */}
      {(!response.contacts_with_agents || response.contacts_with_agents.length === 0) && 
       (!response.contacts_without_agents || response.contacts_without_agents.length === 0) &&
       !parsedContacts.length &&
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

      {/* Task Modal */}
      <TaskModal 
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        preselectedContactId={selectedContactForTask?.id}
        initialData={selectedContactForTask ? {
          title: `Follow-up: ${selectedContactForTask.name}`,
          taskType: 'standard'
        } : undefined}
      />
    </div>
  );
}