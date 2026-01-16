import { useState } from 'react';
import { CheckSquare, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContactTasks } from '@/hooks/useContacts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ContactTasksTabProps {
  contactId: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Oczekujące',
  in_progress: 'W trakcie',
  completed: 'Zakończone',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
};

const priorityLabels: Record<string, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
};

export function ContactTasksTab({ contactId }: ContactTasksTabProps) {
  const { data: taskContacts = [], isLoading } = useContactTasks(contactId);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredTasks = taskContacts.filter((tc) => {
    if (statusFilter === 'all') return true;
    return tc.tasks?.status === statusFilter;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Zadania
        </CardTitle>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filtruj status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="pending">Oczekujące</SelectItem>
            <SelectItem value="in_progress">W trakcie</SelectItem>
            <SelectItem value="completed">Zakończone</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Brak zadań</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((taskContact) => {
              const task = taskContact.tasks;
              if (!task) return null;

              return (
                <div
                  key={taskContact.task_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{task.title}</p>
                      {task.task_type === 'cross' && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          Cross-task
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    {task.due_date && (
                      <p className="text-sm text-muted-foreground">
                        Termin: {format(new Date(task.due_date), 'dd MMM yyyy', { locale: pl })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.priority && (
                      <Badge variant="outline">
                        {priorityLabels[task.priority]}
                      </Badge>
                    )}
                    <Badge
                      className={`${statusColors[task.status || 'pending']} text-white border-0`}
                    >
                      {statusLabels[task.status || 'pending']}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
