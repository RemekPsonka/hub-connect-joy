import { MasterAgentResponse, ContactWithAgent, ContactWithoutAgent } from '@/hooks/useContactAgent';
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
import { cn } from '@/lib/utils';

interface MasterAgentMessageProps {
  response: MasterAgentResponse;
}

interface UnifiedContact {
  contact_id: string;
  contact_name: string;
  company?: string;
  semantic_score: number;
  hasAgent: boolean;
  justification: string;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

export function MasterAgentMessage({ response }: MasterAgentMessageProps) {
  const { director } = useAuth();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedContactForTask, setSelectedContactForTask] = useState<{
    id: string;
    name: string;
    company?: string;
  } | null>(null);

  // Combine all contacts into a unified list sorted by score
  const allContacts: UnifiedContact[] = [
    ...(response.contacts_with_agents || []).map((c): UnifiedContact => ({
      contact_id: c.contact_id,
      contact_name: c.contact_name,
      company: c.company,
      semantic_score: c.semantic_score,
      hasAgent: true,
      justification: c.agent_answer || 'Dopasowanie semantyczne'
    })),
    ...(response.contacts_without_agents || []).map((c): UnifiedContact => ({
      contact_id: c.contact_id,
      contact_name: c.contact_name,
      company: c.company,
      semantic_score: c.semantic_score,
      hasAgent: false,
      justification: c.match_reason || 'Dopasowanie semantyczne'
    }))
  ].sort((a, b) => b.semantic_score - a.semantic_score);

  const openTaskModal = (contact: UnifiedContact) => {
    setSelectedContactForTask({
      id: contact.contact_id,
      name: contact.contact_name,
      company: contact.company
    });
    setTaskModalOpen(true);
  };

  const handleQuickNote = async (contact: UnifiedContact) => {
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

  const openConsultation = (contact: UnifiedContact) => {
    window.open(`/consultations?contact_id=${contact.contact_id}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Summary header */}
      {allContacts.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Znaleziono {allContacts.length} kontaktów pasujących do zapytania</span>
        </div>
      )}

      {/* Unified 2-column grid of contacts */}
      {allContacts.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {allContacts.map((contact) => (
            <Card 
              key={contact.contact_id} 
              className={cn(
                "flex flex-col h-full transition-all hover:shadow-md",
                contact.hasAgent 
                  ? "border-2 border-green-500/40" 
                  : "border border-border hover:border-primary/30"
              )}
            >
              <CardContent className="p-4 flex flex-col h-full">
                {/* Header: Avatar + Info + Score Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className={cn(
                      "h-10 w-10 flex-shrink-0",
                      contact.hasAgent 
                        ? "border-2 border-green-500/30" 
                        : "border border-border"
                    )}>
                      <AvatarFallback className={cn(
                        "font-medium text-sm",
                        contact.hasAgent 
                          ? "bg-green-500/10 text-green-700 dark:text-green-300" 
                          : "bg-primary/10 text-primary"
                      )}>
                        {getInitials(contact.contact_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a 
                          href={`/contacts/${contact.contact_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold hover:text-primary hover:underline flex items-center gap-1 text-sm"
                        >
                          {contact.contact_name}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                        {contact.hasAgent && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
                            AI
                          </Badge>
                        )}
                      </div>
                      {contact.company && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{contact.company}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={contact.hasAgent ? "default" : "outline"}
                    className={cn(
                      "flex-shrink-0 text-xs",
                      contact.hasAgent && "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
                    )}
                  >
                    {Math.round(contact.semantic_score * 100)}%
                  </Badge>
                </div>

                {/* Justification - fixed height with line-clamp */}
                <div className={cn(
                  "p-3 rounded-lg h-[72px] overflow-hidden mb-3",
                  contact.hasAgent 
                    ? "bg-muted/50 border border-border/50" 
                    : "bg-muted/30"
                )}>
                  <div className="flex items-start gap-2">
                    {contact.hasAgent && (
                      <Bot className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    )}
                    <p className="text-sm leading-relaxed line-clamp-3">{contact.justification}</p>
                  </div>
                </div>

                {/* Quick actions - 3 buttons */}
                <div className="flex items-center gap-2 mt-auto">
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
