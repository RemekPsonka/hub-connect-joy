import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConsultationTasks, useCreateConsultationTask, ConsultationWithContact } from '@/hooks/useConsultations';
import { useToast } from '@/hooks/use-toast';

interface ConsultationTasksSectionProps {
  consultation: ConsultationWithContact;
}

export function ConsultationTasksSection({ consultation }: ConsultationTasksSectionProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { toast } = useToast();
  const { data: tasks, isLoading } = useConsultationTasks(consultation.id);
  const createTask = useCreateConsultationTask();

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await createTask.mutateAsync({
        consultationId: consultation.id,
        title: newTaskTitle.trim(),
        contactId: consultation.contact_id,
        tenantId: consultation.tenant_id,
      });
      setNewTaskTitle('');
      toast({
        title: 'Dodano',
        description: 'Zadanie zostało utworzone.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać zadania.',
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      handleAddTask();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Zadania ze spotkania</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Task */}
        <div className="flex gap-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nowe zadanie..."
            className="flex-1"
          />
          <Button 
            onClick={handleAddTask} 
            disabled={!newTaskTitle.trim() || createTask.isPending}
            size="sm"
          >
            {createTask.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ml-1">Dodaj</span>
          </Button>
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card"
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span
                  className={
                    task.status === 'completed'
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  }
                >
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak zadań. Dodaj pierwsze zadanie powyżej.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
