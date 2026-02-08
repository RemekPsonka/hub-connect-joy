import { useState } from 'react';
import { useProjectTasks } from '@/hooks/useProjects';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { CheckSquare, Circle, Clock, CheckCircle2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TaskModal } from '@/components/tasks/TaskModal';

interface ProjectTasksTabProps {
  projectId: string;
}

function getTaskStatusIcon(status: string) {
  switch (status) {
    case 'done': return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-primary" />;
    default: return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getTaskStatusLabel(status: string) {
  switch (status) {
    case 'done': return 'Zakończone';
    case 'in_progress': return 'W toku';
    case 'pending': return 'Oczekujące';
    default: return status;
  }
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return <SkeletonCard height="h-48" />;
  }

  if (!tasks?.length) {
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
        title={`Zadania (${tasks.length})`}
        action={
          <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      >
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              {getTaskStatusIcon(task.status || 'pending')}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </p>
                {task.due_date && (
                  <p className="text-xs text-muted-foreground">
                    Termin: {format(new Date(task.due_date), 'd MMM yyyy', { locale: pl })}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {getTaskStatusLabel(task.status || 'pending')}
              </Badge>
            </div>
          ))}
        </div>
      </DataCard>
      <TaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        preselectedProjectId={projectId}
      />
    </>
  );
}
