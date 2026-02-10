import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { TaskTypeBadge } from './TaskTypeBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import {
  Calendar,
  Trash2,
  Edit2,
  CheckCircle,
  Loader2,
  Link2,
  Plus,
  FolderKanban,
  Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  useUpdateTask,
  useDeleteTask,
  useSubtasks,
  useCreateSubtask,
  useUpdateCrossTaskStatus,
  useDuplicateTask,
} from '@/hooks/useTasks';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { calculateCrossTaskStatus } from '@/utils/crossTaskStatus';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { TaskLinkedMeetings } from './TaskLinkedMeetings';
import { TaskComments } from './TaskComments';
import { TaskLabelsManager } from './TaskLabelsManager';
import { TaskDependencies } from './TaskDependencies';

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithDetails;
  onEdit: () => void;
}

export function TaskDetailSheet({ open, onOpenChange, task, onEdit }: TaskDetailSheetProps) {
  const navigate = useNavigate();
  const crossTask = task.cross_tasks?.[0];
  const isCrossTask = task.task_type === 'cross' && crossTask;

  const effectiveStatus = isCrossTask
    ? calculateCrossTaskStatus(crossTask)
    : task.status;

  const updateCrossStatus = useUpdateCrossTaskStatus();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const duplicateTask = useDuplicateTask();

  // Subtasks
  const { data: subtasks = [] } = useSubtasks(task.id);
  const createSubtask = useCreateSubtask();
  const [newSubtask, setNewSubtask] = useState('');

  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    await createSubtask.mutateAsync({ parentTaskId: task.id, title: newSubtask.trim() });
    setNewSubtask('');
  };

  const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
    await updateTask.mutateAsync({
      id: subtaskId,
      status: completed ? 'completed' : 'pending',
    });
  };

  const handleDiscussedChange = async (field: 'discussed_with_a' | 'discussed_with_b', value: boolean) => {
    if (!crossTask) return;
    try {
      await updateCrossStatus.mutateAsync({ crossTaskId: crossTask.id, field, value });
      toast.success(value ? 'Oznaczono jako omówione' : 'Usunięto oznaczenie');
    } catch { toast.error('Wystąpił błąd'); }
  };

  const handleIntroMade = async () => {
    if (!crossTask) return;
    try {
      await updateCrossStatus.mutateAsync({ crossTaskId: crossTask.id, field: 'intro_made', value: true });
      toast.success('Intro oznaczone jako wykonane');
    } catch { toast.error('Wystąpił błąd'); }
  };

  const handleComplete = async () => {
    try {
      await updateTask.mutateAsync({ id: task.id, status: 'completed' });
      toast.success('Zadanie zakończone');
      onOpenChange(false);
    } catch { toast.error('Wystąpił błąd'); }
  };

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success('Zadanie usunięte');
      onOpenChange(false);
    } catch { toast.error('Wystąpił błąd'); }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateTask.mutateAsync(task.id);
      toast.success('Zadanie zduplikowane');
    } catch { toast.error('Nie udało się zduplikować zadania'); }
  };

  const isLoading = updateCrossStatus.isPending || updateTask.isPending;
  const bothDiscussed = crossTask?.discussed_with_a && crossTask?.discussed_with_b;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg text-left">{task.title}</SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <TaskTypeBadge type={task.task_type} />
            <TaskPriorityBadge priority={task.priority} />
            <TaskStatusBadge status={effectiveStatus} />
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Opis</h4>
              <p className="text-sm">{task.description}</p>
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-sm">
            {task.due_date && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(task.due_date), 'd MMMM yyyy', { locale: pl })}
              </div>
            )}
            {task.project_id && (
              <div
                className="flex items-center gap-1.5 text-primary cursor-pointer hover:underline"
                onClick={() => navigate(`/projects/${task.project_id}`)}
              >
                <FolderKanban className="h-3.5 w-3.5" />
                Projekt
              </div>
            )}
          </div>

          {/* Labels */}
          <TaskLabelsManager taskId={task.id} />

          {/* Dependencies */}
          <TaskDependencies taskId={task.id} />

          {/* Cross-task workflow */}
          {isCrossTask && crossTask && (
            <>
              <Separator />
              <div className="flex items-center justify-center gap-3">
                <Card
                  className="flex-1 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/contacts/${crossTask.contact_a_id}`)}
                >
                  <CardContent className="p-3 text-center">
                    <p className="font-medium text-sm">{crossTask.contact_a?.full_name}</p>
                    <p className="text-xs text-muted-foreground">Kontakt A</p>
                  </CardContent>
                </Card>
                <Link2 className="h-6 w-6 text-primary shrink-0" />
                <Card
                  className="flex-1 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/contacts/${crossTask.contact_b_id}`)}
                >
                  <CardContent className="p-3 text-center">
                    <p className="font-medium text-sm">{crossTask.contact_b?.full_name}</p>
                    <p className="text-xs text-muted-foreground">Kontakt B</p>
                  </CardContent>
                </Card>
              </div>

              {crossTask.connection_reason && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Powód połączenia</h4>
                  <p className="text-sm bg-muted p-2.5 rounded-md">{crossTask.connection_reason}</p>
                </div>
              )}

              <div className="space-y-2.5">
                <h4 className="text-sm font-medium text-muted-foreground">Status połączenia</h4>
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-md">
                  <Checkbox
                    checked={crossTask.discussed_with_a || false}
                    onCheckedChange={(v) => handleDiscussedChange('discussed_with_a', !!v)}
                    disabled={isLoading}
                  />
                  <Label className="text-sm cursor-pointer">Omówione z {crossTask.contact_a?.full_name}</Label>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-md">
                  <Checkbox
                    checked={crossTask.discussed_with_b || false}
                    onCheckedChange={(v) => handleDiscussedChange('discussed_with_b', !!v)}
                    disabled={isLoading}
                  />
                  <Label className="text-sm cursor-pointer">Omówione z {crossTask.contact_b?.full_name}</Label>
                </div>
                {bothDiscussed && !crossTask.intro_made && (
                  <Button onClick={handleIntroMade} className="w-full" variant="secondary" size="sm" disabled={isLoading}>
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Intro wykonane
                  </Button>
                )}
                {crossTask.intro_made && (
                  <div className="flex items-center gap-2 p-2.5 bg-success/10 text-success rounded-md text-sm">
                    <CheckCircle className="h-4 w-4" /> Intro wykonane
                  </div>
                )}
              </div>
            </>
          )}

          {/* Subtasks */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                Subtaski {totalSubtasks > 0 && `(${completedSubtasks}/${totalSubtasks})`}
              </h4>
            </div>

            {totalSubtasks > 0 && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={sub.status === 'completed'}
                    onCheckedChange={(v) => handleSubtaskToggle(sub.id, !!v)}
                  />
                  <span className={`text-sm flex-1 ${sub.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Dodaj subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddSubtask}
                disabled={!newSubtask.trim() || createSubtask.isPending}
                className="h-8 px-2"
              >
                {createSubtask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Standard task contacts */}
          {!isCrossTask && task.task_contacts && task.task_contacts.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Powiązane kontakty</h4>
                <div className="space-y-1.5">
                  {task.task_contacts.map((tc) => (
                    <div
                      key={tc.contact_id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                      onClick={() => navigate(`/contacts/${tc.contact_id}`)}
                    >
                      <span className="font-medium">{tc.contacts?.full_name}</span>
                      {tc.contacts?.company && (
                        <span className="text-muted-foreground text-xs">· {tc.contacts.company}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Linked GCal meetings */}
          <TaskLinkedMeetings taskId={task.id} />

          {/* Comments */}
          <TaskComments taskId={task.id} />

          {/* Actions */}
          <Separator />
          <div className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1.5" /> Usuń
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć zadanie?</AlertDialogTitle>
                  <AlertDialogDescription>Ta akcja jest nieodwracalna.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicateTask.isPending}>
                {duplicateTask.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Copy className="h-4 w-4 mr-1.5" />}
                Duplikuj
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-1.5" /> Edytuj
              </Button>
              {!isCrossTask && effectiveStatus !== 'completed' && (
                <Button size="sm" onClick={handleComplete} disabled={updateTask.isPending}>
                  {updateTask.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                  )}
                  Zakończ
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
