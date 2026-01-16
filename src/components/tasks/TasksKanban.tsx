import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskTypeBadge } from './TaskTypeBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { Link2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';

interface TasksKanbanProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, status: string) => void;
}

const columns = [
  { id: 'pending', label: 'Oczekujące', color: 'border-yellow-500' },
  { id: 'in_progress', label: 'W trakcie', color: 'border-blue-500' },
  { id: 'completed', label: 'Zakończone', color: 'border-green-500' },
];

export function TasksKanban({ tasks, onTaskClick, onStatusChange }: TasksKanbanProps) {
  const navigate = useNavigate();

  const getTasksByStatus = (status: string) =>
    tasks.filter((task) => task.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onStatusChange(taskId, status);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);

        return (
          <div
            key={column.id}
            className={`bg-muted/30 rounded-lg p-4 border-t-4 ${column.color}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{column.label}</h3>
              <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {columnTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Brak zadań
                </div>
              ) : (
                columnTasks.map((task) => {
                  const crossTask = task.cross_tasks?.[0];
                  const isCrossTask = task.task_type === 'cross' && crossTask;

                  return (
                    <Card
                      key={task.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onTaskClick(task)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm line-clamp-2">
                            {task.title}
                          </h4>
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
                                className="hover:text-primary cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/contacts/${crossTask.contact_a_id}`);
                                }}
                              >
                                {crossTask.contact_a?.full_name}
                              </span>
                              <Link2 className="h-3 w-3 text-purple-500" />
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
                            task.task_contacts?.slice(0, 2).map((tc, i) => (
                              <span key={tc.contact_id}>
                                {i > 0 && ', '}
                                <span
                                  className="hover:text-primary cursor-pointer"
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
