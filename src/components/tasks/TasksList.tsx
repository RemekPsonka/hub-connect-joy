import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskTypeBadge } from './TaskTypeBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Link2, Calendar, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';

interface TasksListProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, completed: boolean) => void;
}

export function TasksList({ tasks, onTaskClick, onStatusChange }: TasksListProps) {
  const navigate = useNavigate();

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
    <div className="space-y-3">
      {tasks.map((task) => {
        const crossTask = task.cross_tasks?.[0];
        const isCrossTask = task.task_type === 'cross' && crossTask;
        const isCompleted = task.status === 'completed';

        return (
          <Card
            key={task.id}
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              isCompleted ? 'opacity-60' : ''
            }`}
            onClick={() => onTaskClick(task)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={isCompleted}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={(checked) => onStatusChange(task.id, !!checked)}
                  className="mt-1"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className={`font-medium ${isCompleted ? 'line-through' : ''}`}>
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      )}

                      {/* Contacts display */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {isCrossTask ? (
                          <div className="flex items-center gap-2">
                            <span 
                              className="hover:text-primary cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/contacts/${crossTask.contact_a_id}`);
                              }}
                            >
                              {crossTask.contact_a?.full_name}
                            </span>
                            <Link2 className="h-4 w-4 text-purple-500" />
                            <span 
                              className="hover:text-primary cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/contacts/${crossTask.contact_b_id}`);
                              }}
                            >
                              {crossTask.contact_b?.full_name}
                            </span>
                          </div>
                        ) : (
                          task.task_contacts?.map((tc) => (
                            <span 
                              key={tc.contact_id}
                              className="flex items-center gap-1 hover:text-primary cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/contacts/${tc.contact_id}`);
                              }}
                            >
                              {tc.contacts?.full_name}
                              {tc.contacts?.company && (
                                <>
                                  <Building2 className="h-3 w-3" />
                                  <span className="text-xs">{tc.contacts.company}</span>
                                </>
                              )}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <TaskTypeBadge type={task.task_type} />
                        <TaskPriorityBadge priority={task.priority} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TaskStatusBadge status={task.status} />
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), 'd MMM', { locale: pl })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cross-task specific info */}
                  {isCrossTask && crossTask.connection_reason && (
                    <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                      <span className="font-medium">Powód połączenia: </span>
                      {crossTask.connection_reason}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
