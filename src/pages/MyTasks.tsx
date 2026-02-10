import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskModal } from '@/components/tasks/TaskModal';
import { useTasks, useUpdateTask, type TaskWithDetails } from '@/hooks/useTasks';
import { useCurrentDirector } from '@/hooks/useDirectors';
import { Loader2, Calendar, Plus, CheckCircle2, Clock, CalendarDays, Inbox } from 'lucide-react';
import { format, isToday, isThisWeek, isPast, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
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

export default function MyTasks() {
  const { data: currentDirector } = useCurrentDirector();
  const { data: tasks = [], isLoading } = useTasks({
    ownerId: currentDirector?.id,
  });
  const updateTask = useUpdateTask();
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const grouped = useMemo<GroupedTasks>(() => {
    const g: GroupedTasks = { overdue: [], today: [], this_week: [], later: [], no_date: [], completed: [] };
    const now = new Date();

    for (const task of tasks) {
      if (task.status === 'completed') {
        g.completed.push(task);
        continue;
      }
      if (!task.due_date) {
        g.no_date.push(task);
        continue;
      }
      const d = new Date(task.due_date);
      if (isPast(d) && !isToday(d)) {
        g.overdue.push(task);
      } else if (isToday(d)) {
        g.today.push(task);
      } else if (isThisWeek(d, { weekStartsOn: 1 })) {
        g.this_week.push(task);
      } else {
        g.later.push(task);
      }
    }
    return g;
  }, [tasks]);

  const handleStatusChange = async (taskId: string, completed: boolean) => {
    try {
      await updateTask.mutateAsync({ id: taskId, status: completed ? 'completed' : 'pending' });
      toast.success('Status zaktualizowany');
    } catch {
      toast.error('Wystąpił błąd');
    }
  };

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
    setIsEditMode(false);
  };

  const handleEditFromDetail = () => {
    setIsDetailOpen(false);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const visibleSections: Section[] = ['overdue', 'today', 'this_week', 'later', 'no_date'];
  if (showCompleted) visibleSections.push('completed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Moje zadania</h1>
          <p className="text-muted-foreground">Zadania przypisane do Ciebie</p>
        </div>
        <Button onClick={handleNewTask}>
          <Plus className="h-4 w-4 mr-2" /> Nowe zadanie
        </Button>
      </div>

      {visibleSections.map((section) => {
        const sectionTasks = grouped[section];
        if (sectionTasks.length === 0 && section !== 'today') return null;

        const config = SECTION_CONFIG[section];

        return (
          <div key={section} className="space-y-2">
            <div className={`flex items-center gap-2 ${config.color}`}>
              {config.icon}
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                {config.label}
              </h2>
              <Badge variant="secondary" className="text-xs">{sectionTasks.length}</Badge>
            </div>

            {sectionTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Brak zadań na dziś. Wszystko ogarnięte! 🎉
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1">
                {sectionTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => handleTaskClick(task)}
                  >
                    <CardContent className="py-2.5 px-4 flex items-center gap-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={(v) => handleStatusChange(task.id, !!v)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <TaskPriorityBadge priority={task.priority} />
                        <TaskStatusBadge status={task.status} />
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), 'd MMM', { locale: pl })}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
        />
      )}
    </div>
  );
}
