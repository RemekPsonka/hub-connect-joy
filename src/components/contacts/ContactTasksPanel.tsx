import { useState } from 'react';
import { CheckSquare, Plus, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useContactTasksWithCross, useUpdateTask } from '@/hooks/useTasks';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { format, isPast, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TaskWithDetails } from '@/hooks/useTasks';

interface ContactTasksPanelProps {
  contactId: string;
}

export function ContactTasksPanel({ contactId }: ContactTasksPanelProps) {
  const { data: tasks = [] } = useContactTasksWithCross(contactId);
  const updateTask = useUpdateTask();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const openTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'cancelled');

  const handleToggleStatus = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
    updateTask.mutate({ id: taskId, status: newStatus });
  };

  const getDueDateClass = (dueDate: string | null) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Zadania
            {openTasks.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {openTasks.length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            <span className="text-xs">Nowe</span>
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0 space-y-1.5">
          {openTasks.length === 0 && completedTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Brak zadań</p>
          ) : (
            <>
              {openTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1" onClick={() => handleTaskClick(task)}>
                  <Checkbox
                    checked={false}
                    onCheckedChange={(e) => { e && handleToggleStatus(task.id, task.status); }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{task.title}</p>
                    {task.due_date && (
                      <div className={cn('flex items-center gap-1 text-xs', getDueDateClass(task.due_date))}>
                        {isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) ? (
                          <AlertTriangle className="h-2.5 w-2.5" />
                        ) : (
                          <Clock className="h-2.5 w-2.5" />
                        )}
                        <span>{format(new Date(task.due_date), 'dd MMM', { locale: pl })}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}


              {completedTasks.length > 0 && (
                <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
                  <CollapsibleTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-foreground w-full text-left pt-1.5 border-t mt-1.5">
                      Zamknięte ({completedTasks.length})
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {completedTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 py-1 opacity-60 cursor-pointer hover:opacity-80 rounded px-1 -mx-1" onClick={() => handleTaskClick(task)}>
                        <Checkbox
                          checked={true}
                          onCheckedChange={(e) => { e !== undefined && handleToggleStatus(task.id, task.status); }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 h-3.5 w-3.5"
                        />
                        <p className="text-xs line-through truncate">{task.title}</p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <TaskModal
        open={isModalOpen || !!editingTask}
        onOpenChange={(open) => {
          if (!open) { setIsModalOpen(false); setEditingTask(null); }
        }}
        preselectedContactId={contactId}
        task={editingTask}
      />

      {selectedTask && (
        <TaskDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask}
          onEdit={() => {
            setIsDetailOpen(false);
            setEditingTask(selectedTask);
          }}
        />
      )}
    </>
  );
}
