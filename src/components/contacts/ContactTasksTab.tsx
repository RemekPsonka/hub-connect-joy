import { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContactTasksWithCross, useUpdateTask } from '@/hooks/useTasks';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { UnifiedTaskRow } from '@/components/tasks/UnifiedTaskRow';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { toast } from 'sonner';

interface ContactTasksTabProps {
  contactId: string;
}

export function ContactTasksTab({ contactId }: ContactTasksTabProps) {
  const { data: tasks = [], isLoading } = useContactTasksWithCross(contactId);
  const updateTask = useUpdateTask();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === 'all') return true;
    return task.status === statusFilter;
  });

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask.mutateAsync({ id: taskId, status: newStatus });
      toast.success('Status zaktualizowany');
    } catch {
      toast.error('Wystąpił błąd');
    }
  };

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTask(task as TaskWithDetails);
      setIsDetailOpen(true);
      setIsEditMode(false);
    }
  };

  const handleEditFromDetail = () => {
    setIsDetailOpen(false);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Zadania
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtruj status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="todo">Do zrobienia</SelectItem>
                <SelectItem value="in_progress">W trakcie</SelectItem>
                <SelectItem value="completed">Zakończone</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setSelectedTask(null); setIsEditMode(false); setIsModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Brak zadań</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {filteredTasks.map((task) => (
                <UnifiedTaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onClick={handleTaskClick}
                  showSubtasks
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        task={isEditMode ? selectedTask : null}
        preselectedContactId={contactId}
      />

      {selectedTask && (
        <TaskDetailSheet
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask as TaskWithDetails}
          onEdit={handleEditFromDetail}
        />
      )}
    </>
  );
}
