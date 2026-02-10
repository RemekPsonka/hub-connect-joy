import { useState } from 'react';
import { useProjectTasks } from '@/hooks/useProjects';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CheckSquare, Plus, ChevronDown, ChevronRight, MoreHorizontal, Trash2, Pencil, List, GanttChart } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { useUpdateTask } from '@/hooks/useTasks';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { TaskTimeline } from '@/components/tasks/TaskTimeline';
import { useTaskSections, useCreateTaskSection, useDeleteTaskSection } from '@/hooks/useTaskSections';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ProjectTasksTabProps {
  projectId: string;
}

function TaskRow({ task, onClick, onToggleStatus }: {
  task: TaskWithDetails;
  onClick: () => void;
  onToggleStatus: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
      onClick={onClick}
    >
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={() => {}}
        onClick={onToggleStatus}
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
  );
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const { data: sections = [] } = useTaskSections(projectId);
  const createSection = useCreateTaskSection();
  const deleteSection = useDeleteTaskSection();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [taskView, setTaskView] = useState<'list' | 'timeline'>('list');
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

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      await createSection.mutateAsync({ projectId, name: newSectionName.trim() });
      setNewSectionName('');
      setIsAddingSection(false);
      toast.success('Sekcja dodana');
    } catch {
      toast.error('Nie udało się dodać sekcji');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await deleteSection.mutateAsync({ id: sectionId, projectId });
      toast.success('Sekcja usunięta');
    } catch {
      toast.error('Nie udało się usunąć sekcji');
    }
  };

  const toggleCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleAssignSection = (taskId: string, sectionId: string | null) => {
    updateTask.mutate({ id: taskId, section_id: sectionId } as any);
  };

  if (isLoading) {
    return <SkeletonCard height="h-48" />;
  }

  const typedTasks = (tasks || []) as TaskWithDetails[];

  if (!typedTasks.length && sections.length === 0) {
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
        <TaskModal open={isModalOpen} onOpenChange={setIsModalOpen} preselectedProjectId={projectId} />
      </>
    );
  }

  // Group tasks by section
  const unsectionedTasks = typedTasks.filter((t) => !t.section_id);
  const sectionTaskMap = new Map<string, TaskWithDetails[]>();
  for (const section of sections) {
    sectionTaskMap.set(section.id, []);
  }
  for (const task of typedTasks) {
    if (task.section_id && sectionTaskMap.has(task.section_id)) {
      sectionTaskMap.get(task.section_id)!.push(task);
    }
  }

  return (
    <>
      <DataCard
        title={`Zadania (${typedTasks.length})`}
        action={
          <div className="flex gap-1 items-center">
            <ToggleGroup type="single" value={taskView} onValueChange={(v) => v && setTaskView(v as 'list' | 'timeline')} size="sm">
              <ToggleGroupItem value="list" aria-label="Lista"><List className="h-3.5 w-3.5" /></ToggleGroupItem>
              <ToggleGroupItem value="timeline" aria-label="Timeline"><GanttChart className="h-3.5 w-3.5" /></ToggleGroupItem>
            </ToggleGroup>
            <Button variant="ghost" size="sm" onClick={() => setIsAddingSection(true)}>
              <Plus className="h-4 w-4 mr-1" /> Sekcja
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Zadanie
            </Button>
          </div>
        }
      >
        {taskView === 'timeline' ? (
          <TaskTimeline tasks={typedTasks} onTaskClick={handleTaskClick} />
        ) : (
        <div className="space-y-4">
          {isAddingSection && (
            <div className="flex gap-2">
              <Input
                placeholder="Nazwa sekcji..."
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                className="h-8 text-sm"
                autoFocus
              />
              <Button size="sm" className="h-8" onClick={handleAddSection} disabled={createSection.isPending}>
                Dodaj
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsAddingSection(false)}>
                Anuluj
              </Button>
            </div>
          )}

          {/* Sections */}
          {sections.map((section) => {
            const sectionTasks = sectionTaskMap.get(section.id) || [];
            const isCollapsed = collapsedSections.has(section.id);

            return (
              <div key={section.id}>
                <div className="flex items-center gap-2 py-1.5 border-b">
                  <button onClick={() => toggleCollapse(section.id)} className="p-0.5">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: section.color }} />
                  <span className="text-sm font-semibold flex-1">{section.name}</span>
                  <Badge variant="secondary" className="text-xs">{sectionTasks.length}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeleteSection(section.id)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Usuń sekcję
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {!isCollapsed && (
                  <div className="divide-y divide-border pl-4">
                    {sectionTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">Brak zadań w sekcji</p>
                    ) : (
                      sectionTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onClick={() => handleTaskClick(task)}
                          onToggleStatus={(e) => handleStatusToggle(e, task)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unsectioned tasks */}
          {unsectionedTasks.length > 0 && (
            <div>
              {sections.length > 0 && (
                <div className="flex items-center gap-2 py-1.5 border-b">
                  <span className="text-sm font-semibold text-muted-foreground">Bez sekcji</span>
                  <Badge variant="secondary" className="text-xs">{unsectionedTasks.length}</Badge>
                </div>
              )}
              <div className="divide-y divide-border">
                {unsectionedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    onToggleStatus={(e) => handleStatusToggle(e, task)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </DataCard>

      <TaskModal open={isModalOpen} onOpenChange={setIsModalOpen} preselectedProjectId={projectId} />

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
