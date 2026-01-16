import { useState } from 'react';
import { TasksHeader } from '@/components/tasks/TasksHeader';
import { TasksList } from '@/components/tasks/TasksList';
import { TasksKanban } from '@/components/tasks/TasksKanban';
import { TaskModal } from '@/components/tasks/TaskModal';
import { CrossTaskDetail } from '@/components/tasks/CrossTaskDetail';
import { useTasks, usePendingTasksCount, useUpdateTask, type TasksFilters, type TaskWithDetails } from '@/hooks/useTasks';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Tasks() {
  const [filters, setFilters] = useState<TasksFilters>({});
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: tasks = [], isLoading } = useTasks(filters);
  const { data: pendingCount = 0 } = usePendingTasksCount();
  const updateTask = useUpdateTask();

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
    setIsEditMode(false);
  };

  const handleStatusChange = async (taskId: string, completedOrStatus: boolean | string) => {
    try {
      const status = typeof completedOrStatus === 'boolean' 
        ? (completedOrStatus ? 'completed' : 'pending')
        : completedOrStatus;

      await updateTask.mutateAsync({ id: taskId, status });
      toast.success('Status zaktualizowany');
    } catch (error) {
      toast.error('Wystąpił błąd');
    }
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEditFromDetail = () => {
    setIsDetailOpen(false);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TasksHeader
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        onNewTask={handleNewTask}
        pendingCount={pendingCount}
      />

      {view === 'list' ? (
        <TasksList
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TasksKanban
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
        />
      )}

      <TaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        task={isEditMode ? selectedTask : null}
      />

      {selectedTask && (
        <CrossTaskDetail
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask}
          onEdit={handleEditFromDetail}
        />
      )}
    </div>
  );
}
