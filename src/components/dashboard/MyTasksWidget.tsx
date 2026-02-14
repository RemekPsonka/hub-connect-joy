import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useCurrentDirector } from '@/hooks/useDirectors';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export function MyTasksWidget() {
  const navigate = useNavigate();
  const { data: currentDirector } = useCurrentDirector();
  
  const { data: myTasks = [], isLoading } = useTasks({
    ownerId: currentDirector?.id,
    visibility: 'private',
    status: 'todo',
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

  const urgentTasks = myTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
  const regularTasks = myTasks.filter(t => t.priority !== 'urgent' && t.priority !== 'high');
  const displayTasks = [...urgentTasks, ...regularTasks].slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Moje zadania
          </CardTitle>
          {myTasks.length > 0 && (
            <Badge variant="secondary">{myTasks.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayTasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Brak oczekujących zadań prywatnych</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/tasks?taskId=${task.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {(task.priority === 'urgent' || task.priority === 'high') && (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <span className="font-medium truncate">{task.title}</span>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: pl })}
                    </div>
                  )}
                </div>
                <Badge
                  variant={
                    task.priority === 'urgent' ? 'destructive' :
                    task.priority === 'high' ? 'default' : 'secondary'
                  }
                  className="ml-2 flex-shrink-0"
                >
                  {task.priority === 'urgent' ? 'Pilne' :
                   task.priority === 'high' ? 'Wysoki' :
                   task.priority === 'medium' ? 'Średni' : 'Niski'}
                </Badge>
              </div>
            ))}
            
            {myTasks.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => navigate('/tasks?visibility=private')}
              >
                Zobacz wszystkie ({myTasks.length})
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
