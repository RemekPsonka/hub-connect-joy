import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TaskTypeBadge } from './TaskTypeBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { KanbanInlineCreate } from './KanbanInlineCreate';
import { Link2, Calendar, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TasksKanbanProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, status: string) => void;
}

const columns = [
  { id: 'pending', label: 'Oczekujące', color: 'border-yellow-500', dropColor: 'ring-yellow-500/50' },
  { id: 'in_progress', label: 'W trakcie', color: 'border-blue-500', dropColor: 'ring-blue-500/50' },
  { id: 'completed', label: 'Zakończone', color: 'border-green-500', dropColor: 'ring-green-500/50' },
];

export function TasksKanban({ tasks, onTaskClick, onStatusChange }: TasksKanbanProps) {
  const navigate = useNavigate();
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);

  const getTasksByStatus = (status: string) =>
    tasks.filter((task) => task.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create custom drag image
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    e.dataTransfer.setDragImage(dragElement, rect.width / 2, 20);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      // Only trigger if status actually changed
      if (task && task.status !== status) {
        onStatusChange(taskId, status);
        setJustDroppedId(taskId);
        setTimeout(() => setJustDroppedId(null), 500);
      }
    }
    
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const getColumnDropIndicatorColor = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    return column?.dropColor || 'ring-primary/50';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);
        const isDropTarget = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={cn(
              "bg-muted/30 rounded-lg p-4 border-t-4 transition-all duration-200 min-h-[400px]",
              column.color,
              isDropTarget && [
                "ring-2",
                getColumnDropIndicatorColor(column.id),
                "bg-primary/5",
                "scale-[1.01]",
                "animate-column-highlight"
              ]
            )}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{column.label}</h3>
              <span className={cn(
                "text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full transition-all duration-200",
                isDropTarget && "bg-primary/20 text-primary"
              )}>
                {columnTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnTasks.length === 0 ? (
                <div className={cn(
                  "text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg transition-all duration-200",
                  isDropTarget ? "border-primary/50 bg-primary/5" : "border-transparent"
                )}>
                  {isDropTarget ? "Upuść tutaj" : "Brak zadań"}
                </div>
              ) : (
                columnTasks.map((task) => {
                  const crossTask = task.cross_tasks?.[0];
                  const isCrossTask = task.task_type === 'cross' && crossTask;
                  const isDragging = draggingTaskId === task.id;
                  const wasJustDropped = justDroppedId === task.id;

                  return (
                    <Card
                      key={task.id}
                      className={cn(
                        "cursor-grab active:cursor-grabbing transition-all duration-200 group",
                        isDragging && [
                          "opacity-50",
                          "scale-[0.98]",
                          "ring-2",
                          "ring-primary/50",
                          "rotate-1"
                        ],
                        wasJustDropped && [
                          "animate-card-drop",
                          "ring-2",
                          getColumnDropIndicatorColor(column.id)
                        ],
                        !isDragging && !wasJustDropped && "hover:shadow-md hover:scale-[1.02]"
                      )}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => !isDragging && onTaskClick(task)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            <h4 className="font-medium text-sm line-clamp-2">
                              {task.title}
                            </h4>
                          </div>
                          <TaskPriorityBadge priority={task.priority} />
                        </div>

                        <div className="flex items-center gap-1 flex-wrap">
                          <TaskTypeBadge type={task.task_type} />
                          {task.due_date && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.due_date), 'd MMM', { locale: pl })}
                            </span>
                          )}
                        </div>

                        {/* Contact(s) */}
                        <div className="text-xs text-muted-foreground">
                          {isCrossTask ? (
                            <div className="flex items-center gap-1">
                              <span
                                className="hover:text-primary cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/contacts/${crossTask.contact_a_id}`);
                                }}
                              >
                                {crossTask.contact_a?.full_name}
                              </span>
                              <Link2 className="h-3 w-3 text-purple-500" />
                              <span
                                className="hover:text-primary cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/contacts/${crossTask.contact_b_id}`);
                                }}
                              >
                                {crossTask.contact_b?.full_name}
                              </span>
                            </div>
                          ) : (
                            task.task_contacts?.slice(0, 2).map((tc, i) => (
                              <span key={tc.contact_id}>
                                {i > 0 && ', '}
                                <span
                                  className="hover:text-primary cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/contacts/${tc.contact_id}`);
                                  }}
                                >
                                  {tc.contacts?.full_name}
                                </span>
                              </span>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}

              {/* Drop placeholder at bottom when dragging */}
              {isDropTarget && columnTasks.length > 0 && (
                <div className="h-16 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 flex items-center justify-center text-sm text-primary/70 animate-pulse">
                  Upuść tutaj
                </div>
              )}

              {/* Inline create */}
              <KanbanInlineCreate status={column.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
