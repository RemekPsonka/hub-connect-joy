import { MasterAgentResponse, SuggestedAction, ContactWithAgent, ContactWithoutAgent } from '@/hooks/useContactAgent';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Brain, 
  Users, 
  Building2,
  Bot,
  ExternalLink,
  ListTodo,
  StickyNote,
  CalendarPlus,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';
import { TaskModal } from '@/components/tasks/TaskModal';

interface MasterAgentMessageProps {
  response: MasterAgentResponse;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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

  const openTaskModal = (contact: ContactWithAgent | ContactWithoutAgent) => {
    setSelectedContactForTask({
      id: contact.contact_id,
      name: contact.contact_name,
      company: contact.company || undefined
    });
    setTaskModalOpen(true);
  };

  const handleQuickNote = async (contact: ContactWithAgent | ContactWithoutAgent) => {
    const note = prompt(`Dodaj notatkę dla ${contact.contact_name}:`);
    if (!note) return;
    
    setLoadingAction(`note-${contact.contact_id}`);
    try {
      const { data: currentContact, error: fetchError } = await supabase
        .from('contacts')
        .select('notes')
        .eq('id', contact.contact_id)
        .single();
        
      if (fetchError) throw fetchError;
      
      const timestamp = new Date().toLocaleDateString('pl-PL');
      const newNote = `\n\n[${timestamp}] ${note}`;
      
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ notes: (currentContact?.notes || '') + newNote })
        .eq('id', contact.contact_id);
        
      if (updateError) throw updateError;
      toast.success(`Dodano notatkę dla ${contact.contact_name}`);
    } catch (err) {
      console.error('Note error:', err);
      toast.error('Nie udało się dodać notatki');
    } finally {
      setLoadingAction(null);
    }
  };

  const openConsultation = (contact: ContactWithAgent | ContactWithoutAgent) => {
    window.open(`/consultations?contact_id=${contact.contact_id}`, '_blank');
  };

  const totalContacts = 
    (response.contacts_with_agents?.length || 0) + 
    (response.contacts_without_agents?.length || 0);

  return (
    <div className="space-y-4">
      {/* Summary header */}
      {totalContacts > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Znaleziono {totalContacts} kontaktów pasujących do zapytania</span>
        </div>
      )}

      {/* ============= CONTACTS WITH ACTIVE AGENTS ============= */}
      {response.contacts_with_agents && response.contacts_with_agents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
            <Bot className="h-4 w-4" />
            <span>Z agentem AI ({response.contacts_with_agents.length})</span>
          </div>
          
          <div className="grid gap-3">
            {response.contacts_with_agents.map((contact) => (
              <Card 
                key={contact.contact_id} 
                className="border-2 border-green-500/40 bg-card hover:shadow-md transition-all"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header: Avatar + Info + Score Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-11 w-11 border-2 border-green-500/30 flex-shrink-0">
                        <AvatarFallback className="bg-green-500/10 text-green-700 dark:text-green-300 font-medium">
                          {getInitials(contact.contact_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <a 
                          href={`/contacts/${contact.contact_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold hover:text-primary hover:underline flex items-center gap-1.5"
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
                    <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 flex-shrink-0">
                      {Math.round(contact.semantic_score * 100)}%
                    </Badge>
                  </div>

                  {/* Justification - agent answer */}
                  {contact.agent_answer && (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                      <div className="flex items-start gap-2">
                        <Bot className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm leading-relaxed">{contact.agent_answer}</p>
                      </div>
                    </div>
                  )}

                  {/* Quick actions - 3 buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 flex-1"
                      onClick={() => openTaskModal(contact)}
                    >
                      <ListTodo className="h-3.5 w-3.5" />
                      Zadanie
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 flex-1"
                      onClick={() => openConsultation(contact)}
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Spotkanie
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 flex-1"
                      onClick={() => handleQuickNote(contact)}
                      disabled={loadingAction === `note-${contact.contact_id}`}
                    >
                      {loadingAction === `note-${contact.contact_id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <StickyNote className="h-3.5 w-3.5" />
                      )}
                      Notatka
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============= CONTACTS WITHOUT AGENTS ============= */}
      {response.contacts_without_agents && response.contacts_without_agents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Dopasowane kontakty ({response.contacts_without_agents.length})</span>
          </div>
          
          <div className="grid gap-3">
            {response.contacts_without_agents.map((contact) => (
              <Card 
                key={contact.contact_id} 
                className="border border-border hover:border-primary/30 hover:shadow-md transition-all"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header: Avatar + Info + Score Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-11 w-11 border border-border flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(contact.contact_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <a 
                          href={`/contacts/${contact.contact_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold hover:text-primary hover:underline flex items-center gap-1.5"
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
                    <Badge variant="outline" className="flex-shrink-0">
                      {Math.round(contact.semantic_score * 100)}%
                    </Badge>
                  </div>

                  {/* Justification - match reason */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm">{contact.match_reason}</p>
                  </div>

                  {/* CTA to activate agent */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" />
                    <span>Aktywuj agenta AI, aby uzyskać szczegółowe informacje</span>
                  </div>

                  {/* Quick actions - 3 buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 flex-1"
                      onClick={() => openTaskModal(contact)}
                    >
                      <ListTodo className="h-3.5 w-3.5" />
                      Zadanie
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 flex-1"
                      onClick={() => openConsultation(contact)}
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Spotkanie
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 flex-1"
                      onClick={() => handleQuickNote(contact)}
                      disabled={loadingAction === `note-${contact.contact_id}`}
                    >
                      {loadingAction === `note-${contact.contact_id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <StickyNote className="h-3.5 w-3.5" />
                      )}
                      Notatka
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
