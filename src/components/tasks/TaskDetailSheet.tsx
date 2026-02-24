import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Calendar as DayPickerCalendar } from '@/components/ui/calendar';
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
  Diamond,
} from 'lucide-react';
import { format, parse } from 'date-fns';
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
import { supabase } from '@/integrations/supabase/client';
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
import { offeringStageLabel } from '@/utils/offeringStageLabels';
import { TaskComments } from './TaskComments';
import { TaskLabelsManager } from './TaskLabelsManager';
import { TaskDependencies } from './TaskDependencies';
import { TaskTimeTracker } from './TaskTimeTracker';
import { TaskCustomFields } from './TaskCustomFields';
import { TaskActivityLog } from './TaskActivityLog';
import { TaskAttachments } from './TaskAttachments';
import { getRecurrenceLabel } from './RecurrenceSelector';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './UnifiedTaskRow';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { NextActionDialog } from '@/components/deals-team/NextActionDialog';
import { SnoozeDialog } from '@/components/deals-team/SnoozeDialog';
import { ConvertToClientDialog } from '@/components/deals-team/ConvertToClientDialog';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
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

// ─── Milestone meta row (needs its own hook call) ───────────

function MilestoneMetaRow({ milestoneId, projectId, navigate }: { milestoneId: string; projectId: string; navigate: (path: string) => void }) {
  const { data: milestones } = useProjectMilestones(projectId);
  const milestone = milestones?.find(m => m.id === milestoneId);
  if (!milestone) return null;
  return (
    <MetaRow label="Kamień milowy">
      <div
        className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
        onClick={() => navigate(`/projects/${projectId}?tab=milestones`)}
      >
        <Diamond className="h-3.5 w-3.5 text-amber-500" />
        <span>{milestone.name}</span>
      </div>
    </MetaRow>
  );
}

// ─── Pipeline stage row (interactive dropdowns) ────────────

import { SUB_KANBAN_CONFIGS, CATEGORY_OPTIONS, WORKFLOW_COLUMNS } from '@/config/pipelineStages';
import { ChevronDown } from 'lucide-react';
import type { DealCategory, OfferingStage } from '@/types/dealTeam';

function InteractivePipelineStageRow({ teamContactId, teamId }: { teamContactId: string; teamId: string }) {
  const { data } = useQuery({
    queryKey: ['deal-team-contact-stage', teamContactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select('category, offering_stage')
        .eq('id', teamContactId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!teamContactId,
    staleTime: 30_000,
  });

  const updateContact = useUpdateTeamContact();

  const currentCategory = (data?.category || 'lead') as DealCategory;
  const currentStage = data?.offering_stage as OfferingStage | null;
  const catOption = CATEGORY_OPTIONS.find(c => c.value === currentCategory) || CATEGORY_OPTIONS[4];
  const subConfig = SUB_KANBAN_CONFIGS[currentCategory];

  // Find current workflow column
  const currentWorkflowCol = WORKFLOW_COLUMNS.find(col => col.match(currentCategory, currentStage));

  const handleCategoryChange = (newCat: DealCategory) => {
    if (newCat === currentCategory) return;
    updateContact.mutate({ id: teamContactId, teamId, category: newCat });
  };

  const handleStageChange = (newStage: OfferingStage) => {
    if (newStage === currentStage) return;
    updateContact.mutate({ id: teamContactId, teamId, offeringStage: newStage });
  };

  const handleWorkflowChange = (col: typeof WORKFLOW_COLUMNS[number]) => {
    if (col.id === currentWorkflowCol?.id) return;
    // Reverse-map: determine category and stage from the workflow column
    // Check which category this column belongs to by testing match
    const testMappings: { cat: DealCategory; stage?: OfferingStage }[] = [
      { cat: 'hot', stage: 'meeting_plan' as OfferingStage },
      { cat: 'hot', stage: 'meeting_scheduled' as OfferingStage },
      { cat: 'hot', stage: 'meeting_done' as OfferingStage },
      { cat: 'top', stage: 'meeting_plan' as OfferingStage },
      { cat: 'top', stage: 'meeting_scheduled' as OfferingStage },
      { cat: 'top', stage: 'meeting_done' as OfferingStage },
      { cat: 'offering', stage: 'handshake' as OfferingStage },
      { cat: 'offering', stage: 'power_of_attorney' as OfferingStage },
      { cat: 'offering', stage: 'preparation' as OfferingStage },
      { cat: 'offering', stage: 'negotiation' as OfferingStage },
      { cat: 'offering', stage: 'accepted' as OfferingStage },
      { cat: 'offering', stage: 'lost' as OfferingStage },
      { cat: 'audit', stage: 'audit_plan' as OfferingStage },
      { cat: 'audit', stage: 'audit_scheduled' as OfferingStage },
      { cat: 'audit', stage: 'audit_done' as OfferingStage },
      { cat: 'client' },
      { cat: 'lost' },
      { cat: 'lead' },
      { cat: 'cold' },
      { cat: '10x' as DealCategory },
    ];

    // Preferuj mapowanie z aktualna kategoria (aby TOP nie przeskoczyl do HOT)
    const matchSameCat = testMappings.find(
      m => m.cat === currentCategory && col.match(m.cat, m.stage || null)
    );
    const match = matchSameCat || testMappings.find(m => col.match(m.cat, m.stage || null));
    if (!match) return;

    const updates: { id: string; teamId: string; category?: DealCategory; offeringStage?: OfferingStage } = {
      id: teamContactId,
      teamId,
    };

    // If category changes, set it (offering_stage auto-resets via hook logic)
    if (match.cat !== currentCategory) {
      updates.category = match.cat;
    }
    // If stage specified and differs, set it
    if (match.stage) {
      updates.offeringStage = match.stage;
    }

    updateContact.mutate(updates);
  };

  if (!data) return null;

  // Group workflow columns by section for dropdown
  const workflowSections = WORKFLOW_COLUMNS.reduce((acc, col) => {
    if (!acc[col.section]) acc[col.section] = [];
    acc[col.section].push(col);
    return acc;
  }, {} as Record<string, typeof WORKFLOW_COLUMNS>);

  return (
    <>
      <MetaRow label="Etap lejka">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:opacity-80',
                catOption.color
              )}>
                <span>{catOption.icon}</span>
                <span>{catOption.label}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              {CATEGORY_OPTIONS.map(opt => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleCategoryChange(opt.value)}
                  className={cn('gap-2', opt.value === currentCategory && 'bg-accent')}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sub-stage dropdown (conditional) */}
          {subConfig && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium bg-muted hover:bg-muted/80 transition-colors">
                  <span>{subConfig.stages.find(s => s.id === currentStage)?.icon || subConfig.stages[0].icon}</span>
                  <span>{subConfig.stages.find(s => s.id === currentStage)?.label || subConfig.stages[0].label}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px]">
                {subConfig.stages.map(stage => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => handleStageChange(stage.id)}
                    className={cn('gap-2', stage.id === currentStage && 'bg-accent')}
                  >
                    <span>{stage.icon}</span>
                    <span>{stage.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </MetaRow>

      {/* Workflow stage row (task kanban column) */}
      <MetaRow label="Etap zadania">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium bg-muted hover:bg-muted/80 transition-colors">
              <span>{currentWorkflowCol?.icon || '📁'}</span>
              <span>{currentWorkflowCol?.label || 'Inne'}</span>
              <span className="text-muted-foreground ml-0.5">({currentWorkflowCol?.section || 'inne'})</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[240px] max-h-[360px] overflow-y-auto">
            {Object.entries(workflowSections).map(([section, cols]) => (
              <div key={section}>
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{section}</div>
                {cols.map(col => (
                  <DropdownMenuItem
                    key={col.id}
                    onClick={() => handleWorkflowChange(col)}
                    className={cn('gap-2', col.id === currentWorkflowCol?.id && 'bg-accent')}
                  >
                    <span>{col.icon}</span>
                    <span>{col.label}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </MetaRow>
    </>
  );
}

// ─── Main component ─────────────────────────────────────────

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithDetails;
  onEdit: () => void;
  onTaskSwitch?: (taskId: string) => void;
}

export function TaskDetailSheet({ open, onOpenChange, task, onEdit, onTaskSwitch }: TaskDetailSheetProps) {
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Pipeline workflow states
  const [nextActionOpen, setNextActionOpen] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const updateTeamContact = useUpdateTeamContact();

  // Extract pipeline data from task
  const isPipelineTask = !!(task as any).deal_team_id;
  const pipelineContactId = task.task_contacts?.[0]?.contacts?.id || '';
  const pipelineContactName = task.task_contacts?.[0]?.contacts?.full_name || '';
  const pipelineTeamContactId = (task as any).deal_team_contact_id || '';
  const pipelineTeamId = (task as any).deal_team_id || '';

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
    await updateTask.mutateAsync({ id: subtaskId, status: completed ? 'completed' : 'todo' });
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

  const handleRecurringNextTask = async () => {
    toast.success('Zadanie zakończone. Tworzę następne…');
    setTimeout(async () => {
      const { data: nextTask } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('source_task_id', task.id)
        .eq('status', 'todo')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (nextTask && onTaskSwitch) {
        toast.success(
          `Następne: ${nextTask.title} — termin ${nextTask.due_date ? format(new Date(nextTask.due_date), 'd MMM yyyy', { locale: pl }) : 'brak'}`,
          {
            duration: 8000,
            action: {
              label: 'Otwórz',
              onClick: () => onTaskSwitch(nextTask.id),
            },
          }
        );
      } else if (nextTask) {
        toast.success(`Następne zadanie utworzone: ${nextTask.title}`);
      }
      onOpenChange(false);
    }, 800);
  };

  const handleComplete = async () => {
    // Pipeline tasks → open NextActionDialog instead of direct completion
    if (isPipelineTask) {
      setNextActionOpen(true);
      return;
    }
    try {
      await updateTask.mutateAsync({ id: task.id, status: 'completed' });
      if ((task as any).recurrence_rule) {
        await handleRecurringNextTask();
      } else {
        toast.success('Zadanie zakończone');
        onOpenChange(false);
      }
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
    // Pipeline tasks completing → open NextActionDialog
    if (newStatus === 'completed' && isPipelineTask) {
      setNextActionOpen(true);
      return;
    }
    await updateTask.mutateAsync({ id: task.id, status: newStatus });
    if (newStatus === 'completed') {
      if ((task as any).recurrence_rule) {
        await handleRecurringNextTask();
      } else {
        onOpenChange(false);
      }
    }
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
    <>
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

            {/* Contact */}
            {task.task_contacts && task.task_contacts.length > 0 && task.task_contacts[0]?.contacts && (
              <MetaRow label="Kontakt">
                <div
                  className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
                  onClick={() => navigate(`/contacts/${task.task_contacts![0].contacts.id}`)}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>{task.task_contacts[0].contacts.full_name}</span>
                  {task.task_contacts[0].contacts.company && (
                    <span className="text-muted-foreground">({task.task_contacts[0].contacts.company})</span>
                  )}
                </div>
              </MetaRow>
            )}

            {/* Pipeline stage info */}
            {isPipelineTask && (
              <InteractivePipelineStageRow teamContactId={pipelineTeamContactId} teamId={pipelineTeamId} />
            )}

            {/* Due date */}
            <MetaRow label="Data wykonania">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{task.due_date ? format(new Date(task.due_date), 'd MMMM yyyy', { locale: pl }) : 'Dodaj termin'}</span>
                  </button>
                </PopoverTrigger>
                <PopoverPrimitive.Content
                  align="start"
                  sideOffset={4}
                  className="z-[100] w-auto rounded-md border bg-popover p-0 shadow-md pointer-events-auto"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <DayPickerCalendar
                    mode="single"
                    selected={task.due_date ? new Date(task.due_date + 'T00:00:00') : undefined}
                    onSelect={async (date: Date | undefined) => {
                      if (date) {
                        try {
                          const formatted = format(date, 'yyyy-MM-dd');
                          await updateTask.mutateAsync({ id: task.id, due_date: formatted });
                          setIsCalendarOpen(false);
                        } catch (error) {
                          toast.error('Nie udało się zmienić terminu');
                        }
                      }
                    }}
                    className="p-3"
                  />
                </PopoverPrimitive.Content>
              </Popover>
            </MetaRow>

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

            {/* Deal team / Pipeline */}
            {task.deal_team && (
              <MetaRow label="Lejek">
                <div
                  className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
                  onClick={() => navigate('/deals-team')}
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span>{task.deal_team.name}</span>
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

            {/* Milestone */}
            {(task as any).milestone_id && task.project_id && (
              <MilestoneMetaRow milestoneId={(task as any).milestone_id} projectId={task.project_id} navigate={navigate} />
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

          {/* Attachments */}
          <TaskAttachments taskId={task.id} />

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

    {/* Pipeline workflow dialogs */}
    {isPipelineTask && (
      <>
        <NextActionDialog
          open={nextActionOpen}
          onOpenChange={setNextActionOpen}
          contactName={pipelineContactName}
          contactId={pipelineContactId}
          teamContactId={pipelineTeamContactId}
          teamId={pipelineTeamId}
          existingTaskId={task.id}
          existingTaskTitle={task.title}
          onConfirm={() => {
            setNextActionOpen(false);
            onOpenChange(false);
          }}
          onSnooze={() => setShowSnooze(true)}
          onConvertToClient={() => setShowConvert(true)}
        />
        <SnoozeDialog
          open={showSnooze}
          onOpenChange={setShowSnooze}
          contactName={pipelineContactName}
          onSnooze={async (until, reason) => {
            try {
              await updateTask.mutateAsync({ id: task.id, status: 'completed' });
              await updateTeamContact.mutateAsync({
                id: pipelineTeamContactId,
                teamId: pipelineTeamId,
                category: '10x' as any,
                notes: reason || undefined,
              });
              toast.success('Kontakt odłożony');
              setShowSnooze(false);
              onOpenChange(false);
            } catch { toast.error('Wystąpił błąd'); }
          }}
        />
        <ConvertToClientDialog
          open={showConvert}
          onOpenChange={setShowConvert}
          teamContactId={pipelineTeamContactId}
          teamId={pipelineTeamId}
          contactName={pipelineContactName}
        />
      </>
    )}
    </>
  );
}
