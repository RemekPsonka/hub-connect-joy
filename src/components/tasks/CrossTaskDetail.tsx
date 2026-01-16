import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TaskTypeBadge } from './TaskTypeBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Link2, Calendar, Trash2, Edit2, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useUpdateCrossTaskStatus, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
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

interface CrossTaskDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithDetails;
  onEdit: () => void;
}

export function CrossTaskDetail({ open, onOpenChange, task, onEdit }: CrossTaskDetailProps) {
  const navigate = useNavigate();
  const crossTask = task.cross_tasks?.[0];
  const isCrossTask = task.task_type === 'cross' && crossTask;

  const updateCrossStatus = useUpdateCrossTaskStatus();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleDiscussedChange = async (field: 'discussed_with_a' | 'discussed_with_b', value: boolean) => {
    if (!crossTask) return;
    
    try {
      await updateCrossStatus.mutateAsync({
        crossTaskId: crossTask.id,
        field,
        value,
      });
      toast.success(value ? 'Oznaczono jako omówione' : 'Usunięto oznaczenie');
    } catch (error) {
      toast.error('Wystąpił błąd');
    }
  };

  const handleIntroMade = async () => {
    if (!crossTask) return;

    try {
      await updateCrossStatus.mutateAsync({
        crossTaskId: crossTask.id,
        field: 'intro_made',
        value: true,
      });
      toast.success('Intro oznaczone jako wykonane');
    } catch (error) {
      toast.error('Wystąpił błąd');
    }
  };

  const handleComplete = async () => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        status: 'completed',
      });
      toast.success('Zadanie zakończone');
      onOpenChange(false);
    } catch (error) {
      toast.error('Wystąpił błąd');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success('Zadanie usunięte');
      onOpenChange(false);
    } catch (error) {
      toast.error('Wystąpił błąd');
    }
  };

  const isLoading = updateCrossStatus.isPending || updateTask.isPending;
  const bothDiscussed = crossTask?.discussed_with_a && crossTask?.discussed_with_b;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <TaskTypeBadge type={task.task_type} />
                <TaskPriorityBadge priority={task.priority} />
                <TaskStatusBadge status={task.status} />
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium mb-2">Opis</h4>
              <p className="text-muted-foreground">{task.description}</p>
            </div>
          )}

          {/* Due date */}
          {task.due_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Termin: {format(new Date(task.due_date), 'd MMMM yyyy', { locale: pl })}</span>
            </div>
          )}

          {/* Cross-task specific content */}
          {isCrossTask && crossTask && (
            <>
              <Separator />
              
              {/* Contacts */}
              <div className="flex items-center justify-center gap-4 py-4">
                <Card 
                  className="flex-1 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/contacts/${crossTask.contact_a_id}`)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="font-medium">{crossTask.contact_a?.full_name}</div>
                    {crossTask.contact_a?.company && (
                      <div className="text-sm text-muted-foreground">{crossTask.contact_a.company}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">Kontakt A</div>
                  </CardContent>
                </Card>

                <Link2 className="h-8 w-8 text-purple-500 flex-shrink-0" />

                <Card 
                  className="flex-1 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/contacts/${crossTask.contact_b_id}`)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="font-medium">{crossTask.contact_b?.full_name}</div>
                    {crossTask.contact_b?.company && (
                      <div className="text-sm text-muted-foreground">{crossTask.contact_b.company}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">Kontakt B</div>
                  </CardContent>
                </Card>
              </div>

              {/* Connection reason */}
              {crossTask.connection_reason && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Powód połączenia</h4>
                  <p className="text-muted-foreground bg-muted p-3 rounded-md">
                    {crossTask.connection_reason}
                  </p>
                </div>
              )}

              {/* Suggested intro */}
              {crossTask.suggested_intro && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Sugerowane intro</h4>
                  <p className="text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {crossTask.suggested_intro}
                  </p>
                </div>
              )}

              <Separator />

              {/* Workflow status */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Status połączenia</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="discussed-a"
                        checked={crossTask.discussed_with_a || false}
                        onCheckedChange={(checked) => handleDiscussedChange('discussed_with_a', !!checked)}
                        disabled={isLoading}
                      />
                      <Label htmlFor="discussed-a" className="cursor-pointer">
                        Omówione z {crossTask.contact_a?.full_name}
                      </Label>
                    </div>
                    {crossTask.discussed_with_a_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(crossTask.discussed_with_a_at), 'd MMM yyyy HH:mm', { locale: pl })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="discussed-b"
                        checked={crossTask.discussed_with_b || false}
                        onCheckedChange={(checked) => handleDiscussedChange('discussed_with_b', !!checked)}
                        disabled={isLoading}
                      />
                      <Label htmlFor="discussed-b" className="cursor-pointer">
                        Omówione z {crossTask.contact_b?.full_name}
                      </Label>
                    </div>
                    {crossTask.discussed_with_b_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(crossTask.discussed_with_b_at), 'd MMM yyyy HH:mm', { locale: pl })}
                      </span>
                    )}
                  </div>

                  {bothDiscussed && !crossTask.intro_made && (
                    <Button
                      onClick={handleIntroMade}
                      className="w-full"
                      variant="secondary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Intro wykonane
                    </Button>
                  )}

                  {crossTask.intro_made && (
                    <div className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-900/30 rounded-md text-green-700 dark:text-green-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Intro wykonane</span>
                      </div>
                      {crossTask.intro_made_at && (
                        <span className="text-xs">
                          {format(new Date(crossTask.intro_made_at), 'd MMM yyyy HH:mm', { locale: pl })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Standard task contacts */}
          {!isCrossTask && task.task_contacts && task.task_contacts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Powiązany kontakt</h4>
              {task.task_contacts.map((tc) => (
                <Card
                  key={tc.contact_id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/contacts/${tc.contact_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="font-medium">{tc.contacts?.full_name}</div>
                    {tc.contacts?.company && (
                      <div className="text-sm text-muted-foreground">{tc.contacts.company}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć zadanie?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ta akcja jest nieodwracalna. Zadanie zostanie trwale usunięte.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edytuj
              </Button>
              {task.status !== 'completed' && (
                <Button size="sm" onClick={handleComplete} disabled={updateTask.isPending}>
                  {updateTask.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Zakończ
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
