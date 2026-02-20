import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TasksHeader } from '@/components/tasks/TasksHeader';
import { TasksList } from '@/components/tasks/TasksList';
import { TasksTable } from '@/components/tasks/TasksTable';
import { TasksKanban } from '@/components/tasks/TasksKanban';
import { TasksTeamView } from '@/components/tasks/TasksTeamView';
import { TasksCalendar } from '@/components/tasks/TasksCalendar';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { BulkTaskActions } from '@/components/tasks/BulkTaskActions';
import { useTaskKeyboardShortcuts } from '@/components/tasks/KeyboardShortcuts';
import { useTasks, usePendingTasksCount, useUpdateTask, type TasksFilters, type TaskWithDetails } from '@/hooks/useTasks';
import { useCurrentDirector } from '@/hooks/useDirectors';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Tasks() {
  const [filters, setFilters] = useState<TasksFilters>({});
  const [view, setView] = useState<'list' | 'kanban' | 'table' | 'calendar' | 'team'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: currentDirector } = useCurrentDirector();
  const directorId = currentDirector?.id;

  const { data: allTasks = [], isLoading } = useTasks(filters);
  const { data: pendingCount = 0 } = usePendingTasksCount();
  const updateTask = useUpdateTask();

  const tasks = useMemo(() => {
    if (!directorId) return [];
    return allTasks.filter(t => t.owner_id === directorId || t.assigned_to === directorId);
  }, [allTasks, directorId]);

  const handleNewTask = useCallback(() => {
    setSelectedTask(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  }, []);

  useTaskKeyboardShortcuts({ onNewTask: handleNewTask, onViewChange: setView });

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
    setIsEditMode(false);
  };

  const handleStatusChange = async (taskId: string, completedOrStatus: boolean | string) => {
    try {
      const status = typeof completedOrStatus === 'boolean' 
        ? (completedOrStatus ? 'completed' : 'todo')
        : completedOrStatus;

      await updateTask.mutateAsync({ id: taskId, status });
      toast.success('Status zaktualizowany');
    } catch (error) {
      toast.error('Wystąpił błąd');
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

  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TasksHeader
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        onNewTask={handleNewTask}
        pendingCount={pendingCount}
      />

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <BulkTaskActions
          selectedIds={Array.from(selectedIds)}
          onClearSelection={handleClearSelection}
        />
      )}

      {view === 'list' ? (
        <TasksList
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      ) : view === 'table' ? (
        <TasksTable
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      ) : view === 'calendar' ? (
        <TasksCalendar
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
        />
      ) : view === 'team' ? (
        <TasksTeamView
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
          onNewTask={handleNewTask}
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
        <TaskDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask}
          onEdit={handleEditFromDetail}
          onTaskSwitch={handleTaskSwitch}
        />
      )}
    </div>
  );
}
