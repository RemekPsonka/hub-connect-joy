import { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useContactTasksWithCross, useUpdateTask } from '@/hooks/useTasks';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { UnifiedTaskRow, STATUS_CYCLE } from '@/components/tasks/UnifiedTaskRow';

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

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      setIsDetailOpen(true);
    }
  };

  const openTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'cancelled');

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTask.mutate({ id: taskId, status: newStatus });
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
        <CardContent className="px-0 pb-1 pt-0">
          {openTasks.length === 0 && completedTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3 px-4">Brak zadań</p>
          ) : (
            <>
              {openTasks.map((task) => (
                <UnifiedTaskRow
                  key={task.id}
                  task={task}
                  compact
                  showSubtasks={false}
                  onStatusChange={handleStatusChange}
                  onClick={handleTaskClick}
                />
              ))}

              {completedTasks.length > 0 && (
                <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
                  <CollapsibleTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-foreground w-full text-left px-4 pt-1.5 border-t mt-1">
                      Zamknięte ({completedTasks.length})
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {completedTasks.map((task) => (
                      <UnifiedTaskRow
                        key={task.id}
                        task={task}
                        compact
                        showSubtasks={false}
                        onStatusChange={handleStatusChange}
                        onClick={handleTaskClick}
                      />
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
