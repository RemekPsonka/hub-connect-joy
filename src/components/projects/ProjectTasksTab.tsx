import { useState } from 'react';
import { useProjectTasks } from '@/hooks/useProjects';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CheckSquare, Plus, ChevronDown, ChevronRight, MoreHorizontal, Trash2, List, GanttChart, ArrowRightLeft } from 'lucide-react';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { UnifiedTaskRow } from '@/components/tasks/UnifiedTaskRow';
import { useUpdateTask } from '@/hooks/useTasks';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { TaskTimeline } from '@/components/tasks/TaskTimeline';
import { useTaskSections, useCreateTaskSection, useDeleteTaskSection, type TaskSection } from '@/hooks/useTaskSections';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableTaskItem } from '@/components/tasks/SortableTaskItem';
import { useTaskReorder } from '@/hooks/useTaskReorder';

interface ProjectTasksTabProps {
  projectId: string;
}

function ProjectTaskRow({ task, onClick, sections, currentSectionId, onMoveToSection, onStatusChange }: {
  task: TaskWithDetails;
  onClick: () => void;
  sections: TaskSection[];
  currentSectionId: string | null;
  onMoveToSection: (taskId: string, sectionId: string | null) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex-1 min-w-0">
        <UnifiedTaskRow
          task={task}
          contactName={task.task_contacts?.[0]?.contacts?.full_name}
          onStatusChange={onStatusChange}
          onClick={() => onClick()}
          showSubtasks
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Przenieś do sekcji
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {currentSectionId && (
                <DropdownMenuItem onClick={() => onMoveToSection(task.id, null)}>
                  Bez sekcji
                </DropdownMenuItem>
              )}
              {currentSectionId && sections.length > 0 && <DropdownMenuSeparator />}
              {sections
                .filter((s) => s.id !== currentSectionId)
                .map((section) => (
                  <DropdownMenuItem key={section.id} onClick={() => onMoveToSection(task.id, section.id)}>
                    <div className="h-2.5 w-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: section.color }} />
                    {section.name}
                  </DropdownMenuItem>
                ))}
              {sections.filter((s) => s.id !== currentSectionId).length === 0 && !currentSectionId && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">Brak sekcji</p>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { data: tasks, isLoading } = useProjectTasks(projectId);
  const { data: sections = [] } = useTaskSections(projectId);
  const createSection = useCreateTaskSection();
  const deleteSection = useDeleteTaskSection();
  const reorderTasks = useTaskReorder();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [taskView, setTaskView] = useState<'list' | 'timeline'>('list');
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const updateTask = useUpdateTask();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleStatusToggle = (e: React.MouseEvent, task: TaskWithDetails) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
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

  const handleMoveToSection = (taskId: string, sectionId: string | null) => {
    updateTask.mutate({ id: taskId, section_id: sectionId } as any);
    toast.success(sectionId ? 'Zadanie przeniesione do sekcji' : 'Zadanie usunięte z sekcji');
  };

  const handleAddTaskInSection = (sectionId: string) => {
    setAddingToSectionId(sectionId);
    setIsModalOpen(true);
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

  // All task IDs for the global sortable context
  const allTaskIds = typedTasks.map((t) => t.id);

  // Find which section a task belongs to
  const findTaskSection = (taskId: string): string | null => {
    const task = typedTasks.find((t) => t.id === taskId);
    return task?.section_id || null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeSection = active.data?.current?.sectionId ?? '__unsectioned__';
    const overSection = over.data?.current?.sectionId ?? '__unsectioned__';

    if (activeSection !== overSection) {
      // Cross-section move: update section_id
      const newSectionId = overSection === '__unsectioned__' ? null : overSection;
      updateTask.mutate({ id: active.id as string, section_id: newSectionId } as any);
    } else {
      // Same section reorder
      const sectionId = activeSection === '__unsectioned__' ? null : activeSection;
      const tasksInSection = sectionId
        ? (sectionTaskMap.get(sectionId) || [])
        : unsectionedTasks;
      const ids = tasksInSection.map((t) => t.id);
      const oldIdx = ids.indexOf(active.id as string);
      const newIdx = ids.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return;
      const newOrder = arrayMove(ids, oldIdx, newIdx);
      reorderTasks.mutate(newOrder);
    }
  };

  const activeTask = activeId ? typedTasks.find((t) => t.id === activeId) : null;

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
            <Button variant="ghost" size="sm" onClick={() => { setAddingToSectionId(null); setIsModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Zadanie
            </Button>
          </div>
        }
      >
        {taskView === 'timeline' ? (
          <TaskTimeline tasks={typedTasks} onTaskClick={handleTaskClick} />
        ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleAddTaskInSection(section.id)}
                    title="Dodaj zadanie w sekcji"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
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
                  <SortableContext items={sectionTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="divide-y divide-border pl-4">
                      {sectionTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">Brak zadań w sekcji</p>
                      ) : (
                        sectionTasks.map((task) => (
                          <SortableTaskItem key={task.id} id={task.id} sectionId={section.id}>
                            <div className="group">
                              <ProjectTaskRow
                                task={task}
                                onClick={() => handleTaskClick(task)}
                                onStatusChange={(taskId, newStatus) => updateTask.mutate({ id: taskId, status: newStatus })}
                                sections={sections}
                                currentSectionId={section.id}
                                onMoveToSection={handleMoveToSection}
                              />
                            </div>
                          </SortableTaskItem>
                        ))
                      )}
                    </div>
                  </SortableContext>
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
              <SortableContext items={unsectionedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-border">
                  {unsectionedTasks.map((task) => (
                    <SortableTaskItem key={task.id} id={task.id} sectionId={null}>
                      <div className="group">
                        <ProjectTaskRow
                          task={task}
                          onClick={() => handleTaskClick(task)}
                          onStatusChange={(taskId, newStatus) => updateTask.mutate({ id: taskId, status: newStatus })}
                          sections={sections}
                          currentSectionId={null}
                          onMoveToSection={handleMoveToSection}
                        />
                      </div>
                    </SortableTaskItem>
                  ))}
                </div>
              </SortableContext>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-background border rounded-md shadow-lg px-4 py-2">
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
        </DndContext>
        )}
      </DataCard>

      <TaskModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setAddingToSectionId(null);
        }}
        preselectedProjectId={projectId}
        preselectedSectionId={addingToSectionId || undefined}
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
