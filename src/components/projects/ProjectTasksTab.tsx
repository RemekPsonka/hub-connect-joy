import { useState } from 'react';
import { useProjectTasks } from '@/hooks/useProjects';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { useUpdateTask } from '@/hooks/useTasks';
import type { TaskWithDetails } from '@/hooks/useTasks';

interface ProjectTasksTabProps {
  projectId: string;
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const updateTask = useUpdateTask();

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleStatusToggle = (e: React.MouseEvent, task: TaskWithDetails) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({ id: task.id, status: newStatus });
  };

  const handleEdit = () => {
    setEditingTask(selectedTask);
    setIsDetailOpen(false);
  };

  if (isLoading) {
    return <SkeletonCard height="h-48" />;
  }

  const typedTasks = (tasks || []) as TaskWithDetails[];

  if (!typedTasks.length) {
    return (
      <>
        <DataCard>
          <EmptyState
            icon={CheckSquare}
            title="Brak zadań"
            description="Dodaj pierwsze zadanie do tego projektu."
            action={{
              label: 'Dodaj zadanie',
              onClick: () => setIsModalOpen(true),
              icon: Plus,
            }}
          />
        </DataCard>
        <TaskModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          preselectedProjectId={projectId}
        />
      </>
    );
  }

  return (
    <>
      <DataCard
        title={`Zadania (${typedTasks.length})`}
        action={
          <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      >
        <div className="divide-y divide-border">
          {typedTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
              onClick={() => handleTaskClick(task)}
            >
              <Checkbox
                checked={task.status === 'completed'}
                onCheckedChange={() => {}}
                onClick={(e) => handleStatusToggle(e, task)}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </p>
                {task.due_date && (
                  <p className="text-xs text-muted-foreground">
                    Termin: {format(new Date(task.due_date), 'd MMM yyyy', { locale: pl })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <TaskPriorityBadge priority={task.priority} />
                <TaskStatusBadge status={task.status || 'pending'} />
              </div>
            </div>
          ))}
        </div>
      </DataCard>

      <TaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        preselectedProjectId={projectId}
      />

      {selectedTask && (
        <TaskDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask}
          onEdit={handleEdit}
        />
      )}

      {editingTask && (
        <TaskModal
          open={!!editingTask}
          onOpenChange={(open) => { if (!open) setEditingTask(null); }}
          task={editingTask}
        />
      )}
    </>
  );
}
