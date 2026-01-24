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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateTask, useCreateCrossTask, useUpdateTask } from '@/hooks/useTasks';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { toast } from 'sonner';
import { ConnectionContactSelect } from '@/components/network/ConnectionContactSelect';

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
  initialData?: TaskInitialData;
  onTaskCreated?: (taskId: string) => void;
}

type TaskType = 'standard' | 'cross' | 'group';

export function TaskModal({ open, onOpenChange, task, preselectedContactId, initialData, onTaskCreated }: TaskModalProps) {
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

  // ConnectionContactSelect handles its own data fetching with search
  const createTask = useCreateTask();
  const createCrossTask = useCreateCrossTask();
  const updateTask = useUpdateTask();

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setTaskType((task.task_type as TaskType) || 'standard');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'pending');
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);

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
    }
  }, [task, preselectedContactId, initialData, open]);

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
          },
          contactId: contactId || undefined,
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
