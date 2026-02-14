import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Plus, CheckSquare } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedTaskRow } from '@/components/tasks/UnifiedTaskRow';
import { TaskModal } from '@/components/tasks/TaskModal';
import { useDealContactAllTasks } from '@/hooks/useDealsTeamAssignments';
import { useUpdateTask } from '@/hooks/useTasks';
import type { DealTeamContact } from '@/types/dealTeam';
import type { TaskWithDetails } from '@/hooks/useTasks';

interface ContactTasksSheetProps {
  contact: DealTeamContact | null;
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskOpen?: (task: TaskWithDetails) => void;
}

export function ContactTasksSheet({ contact, teamId, open, onOpenChange, onTaskOpen }: ContactTasksSheetProps) {
  const { data: tasks = [], isLoading } = useDealContactAllTasks(contact?.contact_id, contact?.id);
  const updateTask = useUpdateTask();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const openTasks = useMemo(() => tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t: any) => t.status === 'completed' || t.status === 'cancelled'), [tasks]);

  if (!contact || !contact.contact) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-lg truncate">
              {contact.contact.full_name}
            </SheetTitle>
            <SheetDescription asChild>
              <div>
                {contact.contact.company && (
                  <span className="block text-sm truncate">{contact.contact.company}</span>
                )}
                {contact.contact.position && (
                  <span className="block text-xs text-muted-foreground truncate">{contact.contact.position}</span>
                )}
                <Link
                  to={`/contacts/${contact.contact_id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
                  onClick={() => onOpenChange(false)}
                >
                  <ExternalLink className="h-3 w-3" />
                  Otwórz profil CRM
                </Link>
              </div>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" />
                  Zadania
                  {openTasks.length > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">
                      {openTasks.length}
                    </Badge>
                  )}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => setTaskModalOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                  Nowe zadanie
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : openTasks.length === 0 && completedTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Brak zadań dla tego kontaktu</p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  {openTasks.map((task: any) => (
                    <UnifiedTaskRow
                      key={task.id}
                      task={task}
                      compact
                      showSubtasks={false}
                      onStatusChange={(taskId, newStatus) => updateTask.mutate({ id: taskId, status: newStatus })}
                      onClick={(taskId) => {
                        const t = tasks.find((x: any) => x.id === taskId);
                        if (t && onTaskOpen) {
                          onOpenChange(false);
                          onTaskOpen(t);
                        }
                      }}
                    />
                  ))}
                  {completedTasks.length > 0 && (
                    <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
                      <CollapsibleTrigger asChild>
                        <button className="text-xs text-muted-foreground hover:text-foreground w-full text-left px-3 py-1.5 border-t bg-muted/30 hover:bg-muted/50 transition-colors">
                          Zamknięte ({completedTasks.length})
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {completedTasks.map((task: any) => (
                          <UnifiedTaskRow
                            key={task.id}
                            task={task}
                            compact
                            showSubtasks={false}
                            onStatusChange={(taskId, newStatus) => updateTask.mutate({ id: taskId, status: newStatus })}
                            onClick={(taskId) => {
                              const t = tasks.find((x: any) => x.id === taskId);
                              if (t && onTaskOpen) {
                                onOpenChange(false);
                                onTaskOpen(t);
                              }
                            }}
                          />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        preselectedContactId={contact.contact_id}
        dealTeamContactId={contact.id}
        dealTeamId={teamId}
      />
    </>
  );
}
