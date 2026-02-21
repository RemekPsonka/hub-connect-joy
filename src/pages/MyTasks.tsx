import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UnifiedTaskRow } from '@/components/tasks/UnifiedTaskRow';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskModal } from '@/components/tasks/TaskModal';
import { NextActionDialog } from '@/components/deals-team/NextActionDialog';
import { SnoozeDialog } from '@/components/deals-team/SnoozeDialog';
import { ConvertToClientDialog } from '@/components/deals-team/ConvertToClientDialog';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useTasks, useUpdateTask, type TaskWithDetails } from '@/hooks/useTasks';
import { useCurrentDirector } from '@/hooks/useDirectors';
import { Loader2, Calendar, Plus, CheckCircle2, Clock, CalendarDays, Inbox } from 'lucide-react';
import { isToday, isThisWeek, isPast } from 'date-fns';
import { toast } from 'sonner';

type Section = 'overdue' | 'today' | 'this_week' | 'later' | 'no_date' | 'completed';

interface GroupedTasks {
  overdue: TaskWithDetails[];
  today: TaskWithDetails[];
  this_week: TaskWithDetails[];
  later: TaskWithDetails[];
  no_date: TaskWithDetails[];
  completed: TaskWithDetails[];
}

const SECTION_CONFIG: Record<Section, { label: string; icon: React.ReactNode; color: string }> = {
  overdue: { label: 'Zaległe', icon: <Clock className="h-4 w-4" />, color: 'text-destructive' },
  today: { label: 'Dzisiaj', icon: <CalendarDays className="h-4 w-4" />, color: 'text-primary' },
  this_week: { label: 'Ten tydzień', icon: <Calendar className="h-4 w-4" />, color: 'text-foreground' },
  later: { label: 'Później', icon: <Inbox className="h-4 w-4" />, color: 'text-muted-foreground' },
  no_date: { label: 'Bez terminu', icon: <Inbox className="h-4 w-4" />, color: 'text-muted-foreground' },
  completed: { label: 'Zakończone', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-muted-foreground' },
};

function groupTasks(tasks: TaskWithDetails[]): GroupedTasks {
  const g: GroupedTasks = { overdue: [], today: [], this_week: [], later: [], no_date: [], completed: [] };
  for (const task of tasks) {
    if (task.status === 'completed') { g.completed.push(task); continue; }
    if (!task.due_date) { g.no_date.push(task); continue; }
    const d = new Date(task.due_date);
    if (isPast(d) && !isToday(d)) g.overdue.push(task);
    else if (isToday(d)) g.today.push(task);
    else if (isThisWeek(d, { weekStartsOn: 1 })) g.this_week.push(task);
    else g.later.push(task);
  }
  return g;
}

function TaskSectionList({
  tasks,
  showCompleted,
  setShowCompleted,
  onTaskClick,
  onStatusChange,
}: {
  tasks: TaskWithDetails[];
  showCompleted: boolean;
  setShowCompleted: (v: boolean) => void;
  onTaskClick: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}) {
  const grouped = useMemo(() => groupTasks(tasks), [tasks]);
  const visibleSections: Section[] = ['overdue', 'today', 'this_week', 'later', 'no_date'];
  if (showCompleted) visibleSections.push('completed');

  return (
    <div className="space-y-4">
      {visibleSections.map((section) => {
        const sectionTasks = grouped[section];
        if (sectionTasks.length === 0 && section !== 'today') return null;
        const config = SECTION_CONFIG[section];

        return (
          <div key={section} className="space-y-2">
            <div className={`flex items-center gap-2 ${config.color}`}>
              {config.icon}
              <h2 className="text-sm font-semibold uppercase tracking-wide">{config.label}</h2>
              <Badge variant="secondary" className="text-xs">{sectionTasks.length}</Badge>
            </div>
            {sectionTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Brak zadań na dziś. Wszystko ogarnięte! 🎉
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {sectionTasks.map((task) => (
                  <UnifiedTaskRow
                    key={task.id}
                    task={task}
                    contactName={task.task_contacts?.[0]?.contacts?.full_name}
                    companyName={task.task_contacts?.[0]?.contacts?.company ?? undefined}
                    onStatusChange={onStatusChange}
                    onClick={onTaskClick}
                    showSubtasks
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {!showCompleted && grouped.completed.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setShowCompleted(true)} className="text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          Pokaż zakończone ({grouped.completed.length})
        </Button>
      )}
    </div>
  );
}

export default function MyTasks() {
  const { data: currentDirector } = useCurrentDirector();
  const directorId = currentDirector?.id;

  const { data: allTasks = [], isLoading } = useTasks({});
  const updateTask = useUpdateTask();
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Pipeline workflow states
  const [nextActionOpen, setNextActionOpen] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [pipelineTask, setPipelineTask] = useState<TaskWithDetails | null>(null);
  const updateTeamContact = useUpdateTeamContact();

  const { myTasks, teamTasks, otherTasks } = useMemo(() => {
    if (!directorId) return { myTasks: [], teamTasks: [], otherTasks: [] };
    const my: TaskWithDetails[] = [];
    const team: TaskWithDetails[] = [];
    const other: TaskWithDetails[] = [];

    for (const task of allTasks) {
      const isOwner = task.owner_id === directorId;
      const isAssignee = task.assigned_to === directorId;
      const isDelegated = isOwner && task.assigned_to && task.assigned_to !== directorId;

      if (isDelegated) {
        team.push(task);
      } else if (isOwner || isAssignee) {
        my.push(task);
      } else if (task.visibility === 'team' || task.deal_team_id) {
        team.push(task);
      } else {
        other.push(task);
      }
    }
    return { myTasks: my, teamTasks: team, otherTasks: other };
  }, [allTasks, directorId]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Pipeline task completing → open NextActionDialog
    if (newStatus === 'completed') {
      const task = allTasks.find(t => t.id === taskId);
      if (task && (task as any).deal_team_id) {
        setPipelineTask(task);
        setNextActionOpen(true);
        return;
      }
    }
    try {
      await updateTask.mutateAsync({ id: taskId, status: newStatus });
      toast.success('Status zaktualizowany');
    } catch {
      toast.error('Wystąpił błąd');
    }
  };

  const handleTaskClick = (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      setIsDetailOpen(true);
      setIsEditMode(false);
    }
  };

  const handleEditFromDetail = () => {
    setIsDetailOpen(false);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleTaskSwitch = useCallback(async (taskId: string) => {
    const cached = allTasks.find(t => t.id === taskId);
    if (cached) {
      setSelectedTask(cached);
      setIsDetailOpen(true);
    } else {
      const { data } = await supabase
        .from('tasks')
        .select(`
          *,
          deal_team:deal_teams(id, name, color),
          task_contacts(contact_id, role, contacts(id, full_name, company)),
          cross_tasks(id, contact_a_id, contact_b_id, connection_reason, suggested_intro, intro_made, discussed_with_a, discussed_with_a_at, discussed_with_b, discussed_with_b_at, intro_made_at, contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company), contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)),
          owner:directors!tasks_owner_id_fkey(id, full_name),
          assignee:directors!tasks_assigned_to_fkey(id, full_name)
        `)
        .eq('id', taskId)
        .single();
      if (data) {
        setSelectedTask(data as TaskWithDetails);
        setIsDetailOpen(true);
      }
    }
  }, [allTasks]);

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  if (isLoading || !directorId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sharedProps = {
    showCompleted,
    setShowCompleted,
    onTaskClick: handleTaskClick,
    onStatusChange: handleStatusChange,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Moje zadania</h1>
          <p className="text-muted-foreground">Zarządzaj swoimi zadaniami</p>
        </div>
        <Button onClick={handleNewTask}>
          <Plus className="h-4 w-4 mr-2" /> Nowe zadanie
        </Button>
      </div>

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">
            Moje {myTasks.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{myTasks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="team">
            Zespołowe {teamTasks.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{teamTasks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="other">
            Inne {otherTasks.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{otherTasks.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my">
          {myTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nie masz przypisanych zadań. Kliknij "Nowe zadanie" aby dodać.
              </CardContent>
            </Card>
          ) : (
            <TaskSectionList tasks={myTasks} {...sharedProps} />
          )}
        </TabsContent>

        <TabsContent value="team">
          {teamTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Brak zadań zespołowych.
              </CardContent>
            </Card>
          ) : (
            <TaskSectionList tasks={teamTasks} {...sharedProps} />
          )}
        </TabsContent>

        <TabsContent value="other">
          {otherTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Brak innych zadań.
              </CardContent>
            </Card>
          ) : (
            <TaskSectionList tasks={otherTasks} {...sharedProps} />
          )}
        </TabsContent>
      </Tabs>

      <TaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        task={isEditMode ? selectedTask : null}
      />

      {selectedTask && (
        <TaskDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask}
          onEdit={handleEditFromDetail}
          onTaskSwitch={handleTaskSwitch}
        />
      )}

      {/* Pipeline workflow dialogs */}
      {pipelineTask && (
        <>
          <NextActionDialog
            open={nextActionOpen}
            onOpenChange={setNextActionOpen}
            contactName={pipelineTask.task_contacts?.[0]?.contacts?.full_name || ''}
            contactId={pipelineTask.task_contacts?.[0]?.contacts?.id || ''}
            teamContactId={(pipelineTask as any).deal_team_contact_id || ''}
            teamId={(pipelineTask as any).deal_team_id || ''}
            existingTaskId={pipelineTask.id}
            existingTaskTitle={pipelineTask.title}
            onConfirm={() => { setPipelineTask(null); }}
            onSnooze={() => setShowSnooze(true)}
            onConvertToClient={() => setShowConvert(true)}
          />
          <SnoozeDialog
            open={showSnooze}
            onOpenChange={setShowSnooze}
            contactName={pipelineTask.task_contacts?.[0]?.contacts?.full_name || ''}
            onSnooze={async (until, reason) => {
              try {
                await updateTask.mutateAsync({ id: pipelineTask.id, status: 'completed' });
                await updateTeamContact.mutateAsync({
                  id: (pipelineTask as any).deal_team_contact_id,
                  teamId: (pipelineTask as any).deal_team_id,
                  category: '10x' as any,
                  notes: reason || undefined,
                });
                toast.success('Kontakt odłożony');
                setShowSnooze(false);
                setPipelineTask(null);
              } catch { toast.error('Wystąpił błąd'); }
            }}
          />
          <ConvertToClientDialog
            open={showConvert}
            onOpenChange={setShowConvert}
            teamContactId={(pipelineTask as any).deal_team_contact_id || ''}
            teamId={(pipelineTask as any).deal_team_id || ''}
            contactName={pipelineTask.task_contacts?.[0]?.contacts?.full_name || ''}
          />
        </>
      )}
    </div>
  );
}
