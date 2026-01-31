import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ArrowRight, Clock, UserCircle } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface TaskWithExtras {
  id: string;
  title: string;
  priority: string | null;
  due_date: string | null;
  status: string | null;
  owner?: { id: string; full_name: string } | null;
  assignee?: { id: string; full_name: string } | null;
  task_categories?: { id: string; name: string; color: string } | null;
}

export function TeamTasksWidget() {
  const navigate = useNavigate();
  
  const { data: teamTasks = [], isLoading } = useTasks({
    visibility: 'team',
    status: 'pending',
    excludeSnoozed: true,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const displayTasks = teamTasks.slice(0, 5) as unknown as TaskWithExtras[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Zadania zespołowe
          </CardTitle>
          {teamTasks.length > 0 && (
            <Badge variant="secondary">{teamTasks.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayTasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Brak oczekujących zadań zespołowych</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/tasks?taskId=${task.id}`)}
              >
                {/* Category color indicator */}
                {task.task_categories && (
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: task.task_categories.color }}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{task.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <UserCircle className="h-3 w-3" />
                        {task.assignee.full_name}
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: pl })}
                      </div>
                    )}
                  </div>
                </div>

                {task.owner && (
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {task.owner.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {teamTasks.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => navigate('/tasks?visibility=team')}
              >
                Zobacz wszystkie ({teamTasks.length})
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
