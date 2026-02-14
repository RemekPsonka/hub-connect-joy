import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { KanbanInlineCreate } from './KanbanInlineCreate';
import { Calendar, GripVertical, AlertTriangle, ListChecks, FolderKanban } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubtasks } from '@/hooks/useTasks';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './UnifiedTaskRow';

interface TasksKanbanProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, status: string) => void;
}

const columns = [
  { id: 'todo', label: 'Do zrobienia', color: 'border-muted-foreground', dropColor: 'ring-muted-foreground/50', bgHint: 'bg-muted-foreground/5' },
  { id: 'in_progress', label: 'W trakcie', color: 'border-blue-500', dropColor: 'ring-blue-500/50', bgHint: 'bg-blue-500/5' },
  { id: 'completed', label: 'Zakończone', color: 'border-green-500', dropColor: 'ring-green-500/50', bgHint: 'bg-green-500/5' },
  { id: 'cancelled', label: 'Anulowane', color: 'border-muted-foreground/50', dropColor: 'ring-muted-foreground/30', bgHint: 'bg-muted/5' },
];

// ─── Subtask mini-indicator for kanban cards ─────────────
function KanbanSubtaskIndicator({ taskId }: { taskId: string }) {
  const { data: subtasks = [] } = useSubtasks(taskId);
  if (subtasks.length === 0) return null;
  const done = subtasks.filter((s: any) => s.status === 'completed').length;
  const total = subtasks.length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ListChecks className="h-3 w-3" />
          {done}/{total}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {done} z {total} subtasków
      </TooltipContent>
    </Tooltip>
  );
}

export function TasksKanban({ tasks, onTaskClick, onStatusChange }: TasksKanbanProps) {
  const navigate = useNavigate();
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);

  // Also include legacy 'pending' mapped to 'todo'
  const getTasksByStatus = (status: string) =>
    tasks.filter((task) => {
      const taskStatus = task.status === 'pending' ? 'todo' : task.status;
      return taskStatus === status;
    });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
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
      const currentStatus = task?.status === 'pending' ? 'todo' : task?.status;
      if (task && currentStatus !== status) {
        onStatusChange(taskId, status);
        setJustDroppedId(taskId);
        setTimeout(() => setJustDroppedId(null), 500);
      }
    }
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);
        const isDropTarget = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={cn(
              'bg-muted/20 rounded-lg border-t-[3px] transition-all duration-200 min-h-[400px] flex flex-col',
              column.color,
              isDropTarget && ['ring-2', column.dropColor, column.bgHint, 'scale-[1.01]']
            )}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <span className={cn(
                'text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted transition-all',
                isDropTarget && 'bg-primary/20 text-primary'
              )}>
                {columnTasks.length}
              </span>
            </div>

            {/* Cards container */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className={cn(
                  'text-center py-8 text-muted-foreground text-xs border-2 border-dashed rounded-lg transition-all',
                  isDropTarget ? 'border-primary/50 bg-primary/5' : 'border-transparent'
                )}>
                  {isDropTarget ? 'Upuść tutaj' : 'Brak zadań'}
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isDragging = draggingTaskId === task.id;
                  const wasJustDropped = justDroppedId === task.id;
                  const pri = PRIORITY_CONFIG[task.priority || 'medium'] || PRIORITY_CONFIG.medium;
                  const assignee = (task as any).assignee;
                  const assigneeInitials = assignee?.full_name
                    ?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || null;
                  const isDone = column.id === 'completed' || column.id === 'cancelled';
                  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isDone;
                  const projectName = (task as any).task_categories?.name;

                  return (
                    <Card
                      key={task.id}
                      className={cn(
                        'cursor-grab active:cursor-grabbing transition-all duration-200 group border-border/60',
                        isDragging && 'opacity-50 scale-[0.98] ring-2 ring-primary/50 rotate-1',
                        wasJustDropped && 'animate-card-drop ring-2',
                        wasJustDropped && column.dropColor,
                        !isDragging && !wasJustDropped && 'hover:shadow-md hover:border-border',
                        isDone && 'opacity-60',
                      )}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => !isDragging && onTaskClick(task)}
                    >
                      <CardContent className="p-2.5 space-y-1.5">
                        {/* Project path */}
                        {projectName && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <FolderKanban className="h-2.5 w-2.5" />
                            <span className="truncate">{projectName}</span>
                          </div>
                        )}

                        {/* Title + contact */}
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          <h4 className={cn(
                            'font-medium text-sm leading-snug line-clamp-2 flex-1',
                            isDone && 'line-through text-muted-foreground'
                          )}>
                            {task.title}
                            {task.task_contacts?.[0]?.contacts?.full_name && (
                              <span className="text-muted-foreground font-normal ml-1">
                                – {task.task_contacts[0].contacts.full_name}
                              </span>
                            )}
                          </h4>
                        </div>

                        {/* Bottom row: priority dot, due date, subtasks, assignee */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {/* Priority dot */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn('w-2 h-2 rounded-full shrink-0', pri.dot)} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{pri.label}</TooltipContent>
                          </Tooltip>

                          {/* Due date */}
                          {task.due_date && (
                            <span className={cn(
                              'flex items-center gap-0.5 text-[11px]',
                              isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                            )}>
                              {isOverdue ? <AlertTriangle className="h-2.5 w-2.5" /> : <Calendar className="h-2.5 w-2.5" />}
                              {format(new Date(task.due_date), 'd MMM', { locale: pl })}
                            </span>
                          )}

                          {/* Subtasks */}
                          <KanbanSubtaskIndicator taskId={task.id} />

                          {/* Spacer */}
                          <div className="flex-1" />

                          {/* Contacts (compact) */}
                          {task.task_contacts && task.task_contacts.length > 0 && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                              {task.task_contacts[0]?.contacts?.full_name}
                              {task.task_contacts.length > 1 && ` +${task.task_contacts.length - 1}`}
                            </span>
                          )}

                          {/* Assignee avatar */}
                          {assigneeInitials && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-5 w-5 shrink-0">
                                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                    {assigneeInitials}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {assignee?.full_name}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}

              {/* Drop placeholder */}
              {isDropTarget && columnTasks.length > 0 && (
                <div className="h-12 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 flex items-center justify-center text-xs text-primary/70 animate-pulse">
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
