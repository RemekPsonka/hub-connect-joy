import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Loader2, Users, User, Share2, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateTask, useCreateCrossTask, useUpdateTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { useTaskCategories, type TaskCategory } from '@/hooks/useTaskCategories';
import { useDirectors } from '@/hooks/useDirectors';
import { useCurrentDirector } from '@/hooks/useDirectors';
import { toast } from 'sonner';
import { ConnectionContactSelect } from '@/components/network/ConnectionContactSelect';
import { RecurrenceSelector, type RecurrenceRule } from './RecurrenceSelector';

interface TaskInitialData {
  title?: string;
  description?: string;
  taskType?: 'standard' | 'cross';
  contactAId?: string;
  contactBId?: string;
  connectionReason?: string;
  priority?: string;
}

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskWithDetails | null;
  preselectedContactId?: string;
  preselectedProjectId?: string;
  preselectedSectionId?: string;
  initialData?: TaskInitialData;
  onTaskCreated?: (taskId: string) => void;
}

type TaskType = 'standard' | 'cross' | 'group';

export function TaskModal({ open, onOpenChange, task, preselectedContactId, preselectedProjectId, preselectedSectionId, initialData, onTaskCreated }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('standard');
  const [contactId, setContactId] = useState('');
  const [contactAId, setContactAId] = useState('');
  const [contactBId, setContactBId] = useState('');
  const [connectionReason, setConnectionReason] = useState('');
  const [suggestedIntro, setSuggestedIntro] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('pending');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [projectId, setProjectId] = useState<string>('');
  
  // New fields for categories and assignment
  const [categoryId, setCategoryId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'team'>('private');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  
  const { data: categories = [] } = useTaskCategories();
  const { data: directors = [] } = useDirectors();
  const { data: currentDirector } = useCurrentDirector();
  const { data: projects } = useProjects();
  
  const createTask = useCreateTask();
  const createCrossTask = useCreateCrossTask();
  const updateTask = useUpdateTask();

  const isEditing = !!task;
  
  // Get selected category
  const selectedCategory = categories.find(c => c.id === categoryId);
  const showVisibilityChoice = selectedCategory?.visibility_type === 'shared';
  const isTeamCategory = selectedCategory?.visibility_type === 'team';

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setTaskType((task.task_type as TaskType) || 'standard');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'pending');
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setCategoryId(task.category_id || 'none');
      setAssignedTo(task.assigned_to || 'self');
      setVisibility((task.visibility as 'private' | 'team') || 'private');
      setProjectId(task.project_id || '');
      setRecurrenceRule((task as any).recurrence_rule || null);

      // Set contacts for existing task
      if (task.task_type === 'cross' && task.cross_tasks?.[0]) {
        setContactAId(task.cross_tasks[0].contact_a_id || '');
        setContactBId(task.cross_tasks[0].contact_b_id || '');
        setConnectionReason(task.cross_tasks[0].connection_reason || '');
        setSuggestedIntro(task.cross_tasks[0].suggested_intro || '');
      } else if (task.task_contacts?.[0]) {
        setContactId(task.task_contacts[0].contact_id);
      }
    } else if (initialData) {
      // Use initial data from recommendation
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setTaskType(initialData.taskType || 'standard');
      setContactAId(initialData.contactAId || '');
      setContactBId(initialData.contactBId || '');
      setConnectionReason(initialData.connectionReason || '');
      setSuggestedIntro('');
      setPriority(initialData.priority || 'medium');
      setStatus('pending');
      setDueDate(undefined);
      setCategoryId('');
      setAssignedTo('');
      setVisibility('private');
      setProjectId(preselectedProjectId || '');
      setRecurrenceRule(null);
      // Set contactId for standard tasks
      if (initialData.taskType !== 'cross' && initialData.contactAId) {
        setContactId(initialData.contactAId);
      }
    } else {
      // Reset form
      setTitle('');
      setDescription('');
      setTaskType('standard');
      setContactId(preselectedContactId || '');
      setContactAId(preselectedContactId || '');
      setContactBId('');
      setConnectionReason('');
      setSuggestedIntro('');
      setPriority('medium');
      setStatus('pending');
      setDueDate(undefined);
      setCategoryId('none');
      setAssignedTo('self');
      setVisibility('private');
      setProjectId(preselectedProjectId || '');
      setRecurrenceRule(null);
    }
  }, [task, preselectedContactId, preselectedProjectId, initialData, open]);

  // Update visibility when category changes
  useEffect(() => {
    if (selectedCategory) {
      if (selectedCategory.visibility_type === 'team') {
        setVisibility('team');
      } else if (selectedCategory.visibility_type === 'individual') {
        setVisibility('private');
      }
    }
  }, [selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Tytuł jest wymagany');
      return;
    }

    if (taskType === 'cross') {
      if (!contactAId || !contactBId) {
        toast.error('Wybierz oba kontakty dla zadania krosowego');
        return;
      }
      if (contactAId === contactBId) {
        toast.error('Kontakt A i B muszą być różne');
        return;
      }
    }

    try {
      if (isEditing && task) {
        await updateTask.mutateAsync({
          id: task.id,
          title,
          description,
          priority,
          status,
          due_date: dueDate?.toISOString().split('T')[0],
          category_id: categoryId || null,
          assigned_to: assignedTo || null,
          visibility: visibility,
          project_id: projectId || null,
        });
        toast.success('Zadanie zaktualizowane');
      } else if (taskType === 'cross') {
        const result = await createCrossTask.mutateAsync({
          title,
          description: description || undefined,
          priority,
          due_date: dueDate?.toISOString().split('T')[0],
          contact_a_id: contactAId,
          contact_b_id: contactBId,
          connection_reason: connectionReason || undefined,
          suggested_intro: suggestedIntro,
        });
        toast.success('Zadanie krosowe utworzone');
        
        // Call onTaskCreated callback if provided (for recommendations)
        if (onTaskCreated && result?.id) {
          onTaskCreated(result.id);
        }
      } else {
        const result = await createTask.mutateAsync({
          task: {
            title,
            description,
            task_type: taskType,
            priority,
            status,
            due_date: dueDate?.toISOString().split('T')[0],
          project_id: projectId || null,
          section_id: preselectedSectionId || null,
          recurrence_rule: recurrenceRule as any,
          },
          contactId: contactId || undefined,
          categoryId: categoryId === 'none' ? undefined : (categoryId || undefined),
          assignedTo: assignedTo === 'self' ? undefined : (assignedTo || undefined),
          visibility: isTeamCategory ? 'team' : visibility,
        });
        toast.success('Zadanie utworzone');
        
        // Call onTaskCreated callback if provided (for recommendations)
        if (onTaskCreated && result?.id) {
          onTaskCreated(result.id);
        }
      }

      onOpenChange(false);
    } catch (error) {
      toast.error('Wystąpił błąd');
      console.error(error);
    }
  };

  const isLoading = createTask.isPending || createCrossTask.isPending || updateTask.isPending;
  const otherDirectors = directors.filter(d => d.id !== currentDirector?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj zadanie' : 'Nowe zadanie'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Wprowadź tytuł zadania"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcjonalny opis zadania"
              rows={3}
            />
          </div>

          {/* Category Selection - NEW */}
          {!isEditing && categories.length > 0 && (
            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię (opcjonalne)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak kategorii</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                        {cat.visibility_type === 'team' && (
                          <Users className="h-3 w-3 text-muted-foreground ml-1" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory?.workflow_steps?.steps && selectedCategory.workflow_steps.steps.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ta kategoria ma {selectedCategory?.workflow_steps?.steps?.length} kroków workflow
                </p>
              )}
            </div>
          )}

          {/* Visibility Choice - only for shared categories */}
          {!isEditing && showVisibilityChoice && (
            <div className="space-y-2">
              <Label>Widoczność</Label>
              <RadioGroup
                value={visibility}
                onValueChange={(v) => setVisibility(v as 'private' | 'team')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="vis-private" />
                  <Label htmlFor="vis-private" className="cursor-pointer flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Prywatne
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="vis-team" />
                  <Label htmlFor="vis-team" className="cursor-pointer flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Zespołowe
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Assignment - NEW */}
          {!isEditing && otherDirectors.length > 0 && (
            <div className="space-y-2">
              <Label>Przypisz do</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Ja (domyślnie)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Ja ({currentDirector?.full_name})</SelectItem>
                  {otherDirectors.map((dir) => (
                    <SelectItem key={dir.id} value={dir.id}>
                      {dir.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Task Type - only for new tasks */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Typ zadania</Label>
              <RadioGroup
                value={taskType}
                onValueChange={(v) => setTaskType(v as TaskType)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="standard" id="standard" />
                  <Label htmlFor="standard" className="cursor-pointer">Standardowe</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cross" id="cross" />
                  <Label htmlFor="cross" className="cursor-pointer">Krosowe</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Standard task contact */}
          {taskType === 'standard' && !isEditing && (
            <div className="space-y-2">
              <Label>Kontakt</Label>
              <ConnectionContactSelect
                value={contactId || null}
                onChange={(id) => setContactId(id || '')}
                placeholder="Wybierz kontakt (opcjonalne)"
              />
            </div>
          )}

          {/* Cross task contacts */}
          {taskType === 'cross' && !isEditing && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kontakt A *</Label>
                  <ConnectionContactSelect
                    value={contactAId || null}
                    onChange={(id) => setContactAId(id || '')}
                    placeholder="Wybierz kontakt A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kontakt B *</Label>
                  <ConnectionContactSelect
                    value={contactBId || null}
                    onChange={(id) => setContactBId(id || '')}
                    placeholder="Wybierz kontakt B"
                    excludeIds={contactAId ? [contactAId] : []}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="connectionReason">Powód połączenia</Label>
                <Textarea
                  id="connectionReason"
                  value={connectionReason}
                  onChange={(e) => setConnectionReason(e.target.value)}
                  placeholder="Dlaczego chcesz połączyć te osoby?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suggestedIntro">Sugerowane intro</Label>
                <Textarea
                  id="suggestedIntro"
                  value={suggestedIntro}
                  onChange={(e) => setSuggestedIntro(e.target.value)}
                  placeholder="Sugerowany tekst wprowadzenia..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Project selection */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Projekt</Label>
              <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <div className="flex items-center">
                    <FolderKanban className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Wybierz projekt (opcjonalne)" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak projektu</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority, Status, Due Date */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Priorytet</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niski</SelectItem>
                  <SelectItem value="medium">Średni</SelectItem>
                  <SelectItem value="high">Wysoki</SelectItem>
                  <SelectItem value="urgent">Pilny</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Oczekujące</SelectItem>
                  <SelectItem value="in_progress">W trakcie</SelectItem>
                  <SelectItem value="completed">Zakończone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Termin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'd MMM yyyy', { locale: pl }) : 'Wybierz'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    locale={pl}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Recurrence */}
          {!isEditing && taskType === 'standard' && (
            <RecurrenceSelector value={recurrenceRule} onChange={setRecurrenceRule} />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Zapisz' : 'Utwórz'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
