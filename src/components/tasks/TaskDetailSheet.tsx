import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Trash2,
  CheckCircle,
  Loader2,
  Link2,
  Plus,
  FolderKanban,
  Copy,
  GripVertical,
  Edit2,
  Repeat,
  User,
  Eye,
  Circle,
  Clock,
  CheckCircle2,
  XCircle,
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
import { useTaskReorder } from '@/hooks/useTaskReorder';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { calculateCrossTaskStatus } from '@/utils/crossTaskStatus';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { TaskLinkedMeetings } from './TaskLinkedMeetings';
import { TaskComments } from './TaskComments';
import { TaskLabelsManager } from './TaskLabelsManager';
import { TaskDependencies } from './TaskDependencies';
import { TaskTimeTracker } from './TaskTimeTracker';
import { TaskCustomFields } from './TaskCustomFields';
import { TaskActivityLog } from './TaskActivityLog';
import { getRecurrenceLabel } from './RecurrenceSelector';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './UnifiedTaskRow';
import { cn } from '@/lib/utils';

// ─── Sortable subtask ──────────────────────────────────────

function SortableSubtaskItem({ subtask, onToggle }: { subtask: any; onToggle: (id: string, checked: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-1">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox checked={subtask.status === 'completed'} onCheckedChange={(v) => onToggle(subtask.id, !!v)} />
      <span className={`text-sm flex-1 ${subtask.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{subtask.title}</span>
    </div>
  );
}

// ─── Metadata row helper ────────────────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-[140px] shrink-0 text-xs font-medium text-muted-foreground pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────

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
  const reorderTasks = useTaskReorder();
  const [newSubtask, setNewSubtask] = useState('');

  // Inline edit states
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(task.description || '');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleSubtaskDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subtasks.findIndex(s => s.id === active.id);
    const newIndex = subtasks.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(subtasks, oldIndex, newIndex);
    reorderTasks.mutate(reordered.map(s => s.id));
  }, [subtasks, reorderTasks]);

  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    await createSubtask.mutateAsync({ parentTaskId: task.id, title: newSubtask.trim() });
    setNewSubtask('');
  };

  const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
    await updateTask.mutateAsync({ id: subtaskId, status: completed ? 'completed' : 'pending' });
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

  const handleTitleSave = async () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue.trim() !== task.title) {
      await updateTask.mutateAsync({ id: task.id, title: titleValue.trim() });
    } else {
      setTitleValue(task.title);
    }
  };

  const handleDescriptionSave = async () => {
    setEditingDescription(false);
    if (descriptionValue !== (task.description || '')) {
      await updateTask.mutateAsync({ id: task.id, description: descriptionValue });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateTask.mutateAsync({ id: task.id, status: newStatus });
    if (newStatus === 'completed') onOpenChange(false);
  };

  const handlePriorityChange = async (newPriority: string) => {
    await updateTask.mutateAsync({ id: task.id, priority: newPriority });
  };

  const isLoading = updateCrossStatus.isPending || updateTask.isPending;
  const bothDiscussed = crossTask?.discussed_with_a && crossTask?.discussed_with_b;

  const owner = (task as any).owner;
  const assignee = (task as any).assignee;
  const visibility = (task as any).visibility;

  const st = STATUS_CONFIG[effectiveStatus || 'todo'] || STATUS_CONFIG.todo;
  const StatusIcon = st.icon;
  const pri = PRIORITY_CONFIG[task.priority || 'medium'] || PRIORITY_CONFIG.medium;

  const visibilityLabels: Record<string, string> = {
    private: 'Prywatne',
    team: 'Zespołowe',
    public: 'Publiczne',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto p-0 flex flex-col">
        {/* ─── Action bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b bg-muted/30">
          <div>
            {!isCrossTask && effectiveStatus !== 'completed' && (
              <Button size="sm" variant="outline" onClick={handleComplete} disabled={updateTask.isPending} className="gap-1.5">
                {updateTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Oznacz jako ukończone
              </Button>
            )}
            {effectiveStatus === 'completed' && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Zakończone
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edytuj">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDuplicate} disabled={duplicateTask.isPending} title="Duplikuj">
              {duplicateTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Usuń">
                  <Trash2 className="h-3.5 w-3.5" />
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
          </div>
        </div>

        {/* ─── Content ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Title - inline editable */}
          {editingTitle ? (
            <Input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') { setTitleValue(task.title); setEditingTitle(false); }
              }}
              className="text-xl font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0"
            />
          ) : (
            <h2
              className="text-xl font-semibold cursor-pointer hover:text-primary/80 transition-colors"
              onClick={() => { setTitleValue(task.title); setEditingTitle(true); }}
            >
              {task.title}
            </h2>
          )}

          {/* ─── Metadata table ──────────────────────────── */}
          <div className="space-y-0.5">
            {/* Assignee */}
            {(owner || assignee) && (
              <MetaRow label="Osoba odpowiedzialna">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{assignee?.full_name || owner?.full_name}</span>
                </div>
              </MetaRow>
            )}

            {/* Due date */}
            {task.due_date && (
              <MetaRow label="Data wykonania">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{format(new Date(task.due_date), 'd MMMM yyyy', { locale: pl })}</span>
                </div>
              </MetaRow>
            )}

            {/* Priority - clickable dropdown */}
            <MetaRow label="Priorytet">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors">
                    <span className={cn('w-2 h-2 rounded-full', pri.dot)} />
                    <span>{pri.label}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-36 bg-popover z-50">
                  {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                    <DropdownMenuItem key={key} onClick={() => handlePriorityChange(key)}>
                      <span className={cn('w-2 h-2 rounded-full mr-2', val.dot)} />
                      {val.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </MetaRow>

            {/* Status - clickable dropdown */}
            <MetaRow label="Status">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors">
                    <StatusIcon className={cn('h-3.5 w-3.5', st.color)} />
                    <span>{st.label}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40 bg-popover z-50">
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => {
                    const Icon = val.icon;
                    return (
                      <DropdownMenuItem key={key} onClick={() => handleStatusChange(key)}>
                        <Icon className={cn('h-3.5 w-3.5 mr-2', val.color)} />
                        {val.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </MetaRow>

            {/* Visibility */}
            {visibility && (
              <MetaRow label="Widoczność">
                <div className="flex items-center gap-2 text-sm">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{visibilityLabels[visibility] || visibility}</span>
                </div>
              </MetaRow>
            )}

            {/* Recurrence */}
            {(task as any).recurrence_rule && (
              <MetaRow label="Cykliczność">
                <div className="flex items-center gap-2 text-sm">
                  <Repeat className="h-3.5 w-3.5 text-primary" />
                  <span>{getRecurrenceLabel((task as any).recurrence_rule) || 'Cykliczne'}</span>
                </div>
              </MetaRow>
            )}

            {/* Project */}
            {task.project_id && (
              <MetaRow label="Projekt">
                <div
                  className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
                  onClick={() => navigate(`/projects/${task.project_id}`)}
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span>Przejdź do projektu</span>
                </div>
              </MetaRow>
            )}
          </div>

          {/* Labels */}
          <TaskLabelsManager taskId={task.id} />

          {/* Custom Fields */}
          <TaskCustomFields taskId={task.id} projectId={task.project_id} />

          {/* Dependencies */}
          <TaskDependencies taskId={task.id} />

          {/* ─── Cross-task workflow ──────────────────────── */}
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
                  <div className="flex items-center gap-2 p-2.5 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-md text-sm">
                    <CheckCircle className="h-4 w-4" /> Intro wykonane
                  </div>
                )}
              </div>
            </>
          )}

          {/* ─── Related contacts ────────────────────────── */}
          {!isCrossTask && task.task_contacts && task.task_contacts.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Powiązane kontakty ({task.task_contacts.length})
                </h4>
                <div className="space-y-1">
                  {task.task_contacts.map((tc) => (
                    <div
                      key={tc.contact_id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                      onClick={() => navigate(`/contacts/${tc.contact_id}`)}
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
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

          {/* ─── Subtasks ────────────────────────────────── */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Subtaski {totalSubtasks > 0 && `(${completedSubtasks}/${totalSubtasks})`}
            </h4>

            {totalSubtasks > 0 && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
              <SortableContext items={subtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {subtasks.map((sub) => (
                    <SortableSubtaskItem key={sub.id} subtask={sub} onToggle={handleSubtaskToggle} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

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

          {/* ─── Description ─────────────────────────────── */}
          <Separator />
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Opis</h4>
            {editingDescription ? (
              <Textarea
                autoFocus
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                onBlur={handleDescriptionSave}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setDescriptionValue(task.description || ''); setEditingDescription(false); }
                }}
                className="text-sm min-h-[80px]"
                placeholder="Czego dotyczy to zadanie?"
              />
            ) : (
              <p
                className="text-sm cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 transition-colors min-h-[32px]"
                onClick={() => { setDescriptionValue(task.description || ''); setEditingDescription(true); }}
              >
                {task.description || <span className="text-muted-foreground italic">Czego dotyczy to zadanie? Kliknij, aby dodać opis...</span>}
              </p>
            )}
          </div>

          {/* Time Tracker */}
          <TaskTimeTracker taskId={task.id} estimatedHours={(task as any).estimated_hours} />

          {/* Linked GCal meetings */}
          <TaskLinkedMeetings taskId={task.id} />

          {/* Activity Log */}
          <TaskActivityLog taskId={task.id} />

          {/* Comments */}
          <Separator />
          <TaskComments taskId={task.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
