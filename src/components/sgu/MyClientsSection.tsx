import { useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronRight, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { useMyTeamAssignments } from '@/hooks/useDealsTeamAssignments';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { UnifiedTaskRow } from '@/components/tasks/UnifiedTaskRow';

interface MyClientsSectionProps {
  teamId: string;
  onClientClick: (contactId: string) => void;
}

export function MyClientsSection({ teamId, onClientClick }: MyClientsSectionProps) {
  const { director } = useAuth();
  const { data: teamContacts = [] } = useTeamContacts(teamId);
  const { data: assignments = [] } = useMyTeamAssignments(teamId);
  const { data: members = [] } = useTeamMembers(teamId);

  const myClients = useMemo(
    () => teamContacts.filter((tc) => tc.assigned_to === director?.id),
    [teamContacts, director?.id],
  );

  if (myClients.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
        <Users className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium">Twoi klienci w lejku</span>
        <Badge variant="secondary" className="text-xs ml-auto">{myClients.length}</Badge>
      </div>
      <div className="divide-y">
        {myClients.map((client) => {
          const clientTasks = assignments.filter(
            (a) =>
              a.deal_team_contact_id === client.id &&
              a.status !== 'completed' &&
              a.status !== 'cancelled',
          );
          return (
            <Collapsible key={client.id}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/40 transition-colors text-left group"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                  <span
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClientClick(client.contact_id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        onClientClick(client.contact_id);
                      }
                    }}
                    className="text-sm font-medium hover:underline cursor-pointer"
                  >
                    {client.contact?.full_name ?? 'Kontakt'}
                  </span>
                  {client.contact?.company && (
                    <span className="text-xs text-muted-foreground truncate">· {client.contact.company}</span>
                  )}
                  <Badge variant="outline" className="text-[10px] uppercase">{client.category}</Badge>
                  {client.next_action_date && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Następna akcja: {format(new Date(client.next_action_date), 'd.MM')}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-xs ml-auto">{clientTasks.length} zadań</Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {clientTasks.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground text-center">Brak otwartych zadań</p>
                ) : (
                  <div>
                    {clientTasks.map((t) => (
                      <UnifiedTaskRow
                        key={t.id}
                        task={t}
                        contactName={t.contact_name || undefined}
                        companyName={t.contact_company || undefined}
                        members={members}
                        showAssignee
                      />
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
}