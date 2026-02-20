import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CalendarIcon, Loader2, PhoneCall, FileText, Send, Moon, UserCheck, XCircle,
  Handshake, Plus,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUpdateTask } from '@/hooks/useTasks';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { DealCategory, OfferingStage } from '@/types/dealTeam';

type ActionType =
  | 'schedule_meeting'    // Umów spotkanie → meeting_plan
  | 'meeting_scheduled'   // Spotkanie umówione → opens MeetingScheduledDialog
  | 'send_offer'          // Wyślij ofertę → offering/handshake
  | 'call'                // Zadzwoń → no stage change
  | 'send_email'          // Wyślij mail → no stage change
  | 'snooze'              // Odłóż → 10x, task completed
  | 'client'              // Klient → ConvertToClientDialog
  | 'lost';               // Utracony → lost, task completed

interface ActionOption {
  value: ActionType;
  label: string;
  description: string;
  icon: typeof PhoneCall;
  needsDate: boolean;
  closesTask: boolean;
}

const ACTION_OPTIONS: ActionOption[] = [
  { value: 'schedule_meeting', label: 'Umów spotkanie', description: 'Zaplanuj termin spotkania', icon: CalendarIcon, needsDate: true, closesTask: false },
  { value: 'meeting_scheduled', label: 'Spotkanie umówione', description: 'Podaj datę umówionego spotkania', icon: Handshake, needsDate: true, closesTask: false },
  { value: 'send_offer', label: 'Wyślij ofertę', description: 'Przenieś do etapu ofertowania', icon: FileText, needsDate: true, closesTask: false },
  { value: 'call', label: 'Zadzwoń', description: 'Zaplanuj telefon', icon: PhoneCall, needsDate: true, closesTask: false },
  { value: 'send_email', label: 'Wyślij mail', description: 'Zaplanuj wysłanie maila', icon: Send, needsDate: true, closesTask: false },
  { value: 'snooze', label: 'Odłóż (10x)', description: 'Odłóż kontakt na później', icon: Moon, needsDate: false, closesTask: true },
  { value: 'client', label: 'Klient', description: 'Konwertuj na klienta', icon: UserCheck, needsDate: false, closesTask: true },
  { value: 'lost', label: 'Utracony', description: 'Oznacz jako przegrany', icon: XCircle, needsDate: false, closesTask: true },
];

interface NextActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactId: string;
  teamContactId: string;
  teamId: string;
  existingTaskId: string;
  existingTaskTitle: string;
  /** Called after successful save */
  onConfirm?: () => void;
  /** Open snooze dialog externally */
  onSnooze?: () => void;
  /** Open convert-to-client dialog externally */
  onConvertToClient?: () => void;
}

export function NextActionDialog({
  open, onOpenChange, contactName, contactId, teamContactId, teamId,
  existingTaskId, existingTaskTitle, onConfirm, onSnooze, onConvertToClient,
}: NextActionDialogProps) {
  const [selected, setSelected] = useState<ActionType | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const actionInProgressRef = useRef(false);

  const updateTask = useUpdateTask();
  const updateContact = useUpdateTeamContact();
  const { data: teamMembers = [] } = useTeamMembers(teamId);

  const selectedOption = ACTION_OPTIONS.find(o => o.value === selected);

  const resetForm = () => {
    setSelected(null);
    setDueDate(undefined);
    setAssignedTo('');
    setNote('');
  };

  const handleSave = async () => {
    if (!selected || actionInProgressRef.current) return;

    // External dialogs
    if (selected === 'snooze') {
      onOpenChange(false);
      onSnooze?.();
      resetForm();
      return;
    }
    if (selected === 'client') {
      onOpenChange(false);
      onConvertToClient?.();
      resetForm();
      return;
    }

    if (selectedOption?.needsDate && !dueDate) {
      toast.error('Wybierz datę');
      return;
    }

    actionInProgressRef.current = true;
    setSaving(true);

    try {
      const dateStr = dueDate ? dueDate.toISOString().split('T')[0] : undefined;

      // Build new task title and kanban updates based on action
      let newTitle = '';
      let newOfferingStage: OfferingStage | undefined;
      let newCategory: DealCategory | undefined;
      let closeTask = false;

      switch (selected) {
        case 'schedule_meeting':
          newTitle = `Umówić spotkanie z ${contactName}`;
          newOfferingStage = 'meeting_plan';
          break;
        case 'meeting_scheduled':
          newTitle = `Spotkanie z ${contactName} - ${dueDate ? format(dueDate, 'd MMM', { locale: pl }) : ''}`;
          newOfferingStage = 'meeting_scheduled';
          break;
        case 'send_offer':
          newTitle = `Wysłać ofertę do ${contactName}`;
          newOfferingStage = 'handshake';
          newCategory = 'offering';
          break;
        case 'call':
          newTitle = `Zadzwonić do ${contactName}`;
          break;
        case 'send_email':
          newTitle = `Wysłać maila do ${contactName}`;
          break;
        case 'lost':
          closeTask = true;
          newCategory = 'lost';
          break;
      }

      if (closeTask) {
        // For lost: mark task as completed and update category
        await updateTask.mutateAsync({ id: existingTaskId, status: 'completed' });
        await updateContact.mutateAsync({
          id: teamContactId,
          teamId,
          ...(newCategory ? { category: newCategory } : {}),
          status: 'lost',
          ...(note ? { notes: note } : {}),
        });
      } else {
        // Recycle existing task: update title, date, status=todo, assignee
        await updateTask.mutateAsync({
          id: existingTaskId,
          title: newTitle,
          status: 'todo',
          ...(dateStr ? { due_date: dateStr } : {}),
          ...(assignedTo ? { assigned_to: assignedTo } : {}),
        });

        // Update kanban stage
        const contactUpdate: any = { id: teamContactId, teamId };
        if (newOfferingStage) contactUpdate.offeringStage = newOfferingStage;
        if (newCategory) contactUpdate.category = newCategory;
        if (note) contactUpdate.notes = note;
        if (selected === 'meeting_scheduled' && dateStr) {
          contactUpdate.nextMeetingDate = dateStr;
        }

        if (newOfferingStage || newCategory || note || contactUpdate.nextMeetingDate) {
          await updateContact.mutateAsync(contactUpdate);
        }
      }

      // Log the recycle action
      try {
        await supabase.from('task_activity_log' as any).insert({
          task_id: existingTaskId,
          action: 'recycled',
          old_value: existingTaskTitle,
          new_value: closeTask ? `[zamknięte: ${selected}]` : newTitle,
          tenant_id: (await supabase.from('tasks').select('tenant_id').eq('id', existingTaskId).single()).data?.tenant_id,
          actor_id: (await supabase.from('directors').select('id').eq('user_id', (await supabase.auth.getUser()).data.user?.id || '').single()).data?.id,
        });
      } catch {
        // Non-critical, ignore logging errors
      }

      toast.success(closeTask ? 'Kontakt zamknięty' : `Dalsze działania: ${newTitle}`);
      onConfirm?.();
      onOpenChange(false);
      resetForm();
    } catch {
      toast.error('Nie udało się zapisać');
    } finally {
      setSaving(false);
      actionInProgressRef.current = false;
    }
  };

  const canSave = selected && (selectedOption?.closesTask || !selectedOption?.needsDate || dueDate);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dalsze działania</DialogTitle>
          <DialogDescription>
            Zadanie „{existingTaskTitle}" zakończone. Co dalej z {contactName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action selection */}
          <div className="grid grid-cols-2 gap-2">
            {ACTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                  selected === opt.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <opt.icon className={cn(
                  "h-4 w-4 mt-0.5 shrink-0",
                  selected === opt.value ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Date picker - shown for actions that need a date */}
          {selected && selectedOption?.needsDate && (
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP', { locale: pl }) : 'Wybierz datę'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Assignee - shown for non-closing actions */}
          {selected && !selectedOption?.closesTask && (
            <div className="space-y-2">
              <Label>Osoba odpowiedzialna</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz osobę..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.director_id} value={m.director_id}>
                      {m.director?.full_name || 'Nieznany'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label>Notatka (opcjonalnie)</Label>
            <Textarea
              placeholder="Notatki..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={saving}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
