import { useState } from 'react';
import { CheckSquare, Link2, Plus } from 'lucide-react';
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
import { useContactTasksWithCross } from '@/hooks/useTasks';
import { TaskModal } from '@/components/tasks/TaskModal';
import { CrossTaskDetail } from '@/components/tasks/CrossTaskDetail';
import { TaskTypeBadge } from '@/components/tasks/TaskTypeBadge';
import { TaskPriorityBadge } from '@/components/tasks/TaskPriorityBadge';
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface ContactTasksTabProps {
  contactId: string;
}

export function ContactTasksTab({ contactId }: ContactTasksTabProps) {
  const { data: tasks = [], isLoading } = useContactTasksWithCross(contactId);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const navigate = useNavigate();

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === 'all') return true;
    return task.status === statusFilter;
  });

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
                <SelectItem value="pending">Oczekujące</SelectItem>
                <SelectItem value="in_progress">W trakcie</SelectItem>
                <SelectItem value="completed">Zakończone</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
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
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const crossTaskInfo = task.crossTaskInfo;
                const isCrossTask = task.task_type === 'cross';

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsDetailOpen(true);
                    }}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                          {task.title}
                        </p>
                        <TaskTypeBadge type={task.task_type} />
                        
                        {/* Cross-task: show connection info */}
                        {isCrossTask && crossTaskInfo?.otherContact && (
                          <Badge 
                            variant="outline" 
                            className="gap-1 text-purple-600 border-purple-300 cursor-pointer hover:bg-purple-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contacts/${crossTaskInfo.otherContact.id}`);
                            }}
                          >
                            <Link2 className="h-3 w-3" />
                            Połączenie z {crossTaskInfo.otherContact.full_name}
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
                    
                    <div className="flex items-center gap-2 ml-4">
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        preselectedContactId={contactId}
      />

      {selectedTask && (
        <CrossTaskDetail
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          task={selectedTask}
          onEdit={() => {
            setIsDetailOpen(false);
            setIsModalOpen(true);
          }}
        />
      )}
    </>
  );
}
