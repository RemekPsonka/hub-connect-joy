 import { useRef } from 'react';
 import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { UnifiedTaskRow } from './UnifiedTaskRow';
import { CrossTaskProgressBadge } from './CrossTaskProgressBadge';
import { Link2, Building2 } from 'lucide-react';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import { calculateCrossTaskStatus, calculateCrossTaskProgress } from '@/utils/crossTaskStatus';

 const CARD_HEIGHT = 140;
 const CARD_GAP = 12;
 
interface TasksListProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, completed: boolean) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
}

export function TasksList({ tasks, onTaskClick, onStatusChange, selectedIds, onToggleSelect }: TasksListProps) {
  const navigate = useNavigate();
 
   const parentRef = useRef<HTMLDivElement>(null);
   const virtualizer = useVirtualizer({
     count: tasks.length,
     getScrollElement: () => parentRef.current,
     estimateSize: () => CARD_HEIGHT + CARD_GAP,
     overscan: 5,
   });

  if (tasks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-center">
            Brak zadań. Dodaj pierwsze zadanie!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
   <div
     ref={parentRef}
     className="overflow-auto"
     style={{ maxHeight: 'calc(100vh - 280px)' }}
   >
     <div
       className="relative"
       style={{ height: virtualizer.getTotalSize() }}
     >
       {virtualizer.getVirtualItems().map((virtualItem) => {
         const task = tasks[virtualItem.index];
        const crossTask = task.cross_tasks?.[0];
        const isCrossTask = task.task_type === 'cross' && crossTask;
        
        // For cross-tasks, calculate effective status based on workflow
        const effectiveStatus = isCrossTask 
          ? calculateCrossTaskStatus(crossTask)
          : task.status;
        const isCompleted = effectiveStatus === 'completed';

          return (
            <div
              key={virtualItem.key}
              className={`absolute left-0 right-0 ${selectedIds?.has(task.id) ? 'ring-2 ring-primary/50 bg-primary/5 rounded' : ''}`}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="flex items-center">
                {onToggleSelect && (
                  <Checkbox
                    checked={selectedIds?.has(task.id) || false}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => onToggleSelect(task.id)}
                    className="ml-3 mr-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <UnifiedTaskRow
                    task={{
                      ...task,
                      status: effectiveStatus,
                    }}
                    onStatusChange={(taskId, newStatus) => {
                      if (!isCrossTask) {
                        onStatusChange(taskId, newStatus === 'completed');
                      }
                    }}
                    onClick={() => onTaskClick(task)}
                    showSubtasks
                  />
                </div>
              </div>
              {/* Cross-task contacts */}
              {isCrossTask && crossTask && (
                <div className="px-12 pb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span
                    className="hover:text-primary cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${crossTask.contact_a_id}`); }}
                  >
                    {crossTask.contact_a?.full_name}
                  </span>
                  <Link2 className="h-4 w-4 text-purple-500" />
                  <span
                    className="hover:text-primary cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${crossTask.contact_b_id}`); }}
                  >
                    {crossTask.contact_b?.full_name}
                  </span>
                  <CrossTaskProgressBadge
                    completed={calculateCrossTaskProgress(crossTask).completed}
                    total={3}
                  />
                </div>
              )}
            </div>
          );
      })}
     </div>
    </div>
  );
}
