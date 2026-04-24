import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CalendarIcon, Loader2, PhoneCall, FileText, Send, Moon, UserCheck, XCircle,
  Handshake, ClipboardCheck, CheckCircle2, Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DealTeamContact, DealCategory, OfferingStage } from '@/types/dealTeam';

type ActionType =
  | 'schedule_meeting'
  | 'meeting_scheduled'
  | 'meeting_done'
  | 'audit'
  | 'send_offer'
  | 'call'
  | 'send_email'
  | 'ten_x'
  | 'snooze'
  | 'client'
  | 'lost';

interface ActionDef {
  value: ActionType;
  label: string;
  icon: typeof PhoneCall;
  needsDate: boolean;
  /** When matches contact category/offering_stage, button is highlighted as active */
  isActive?: (c: DealTeamContact) => boolean;
}

const ACTIONS: ActionDef[] = [
  { value: 'schedule_meeting', label: 'Umów spotkanie', icon: CalendarIcon, needsDate: true,
    isActive: (c) => c.offering_stage === 'meeting_plan' },
  { value: 'meeting_scheduled', label: 'Spotkanie umówione', icon: Handshake, needsDate: true,
    isActive: (c) => c.offering_stage === 'meeting_scheduled' },
  { value: 'meeting_done', label: 'Spotkanie odbyte', icon: CheckCircle2, needsDate: false,
    isActive: (c) => c.offering_stage === 'meeting_done' },
  { value: 'audit', label: 'Audyt', icon: ClipboardCheck, needsDate: true,
    isActive: (c) => c.category === 'audit' },
  { value: 'send_offer', label: 'Wyślij ofertę', icon: FileText, needsDate: true,
    isActive: (c) => c.category === 'offering' },
  { value: 'call', label: 'Zadzwoń', icon: PhoneCall, needsDate: true },
  { value: 'send_email', label: 'Wyślij mail', icon: Send, needsDate: true },
  { value: 'ten_x', label: '10x', icon: Flame, needsDate: false,
    isActive: (c) => c.category === '10x' && !c.snoozed_until },
  { value: 'snooze', label: 'Odłóż', icon: Moon, needsDate: false,
    isActive: (c) => !!c.snoozed_until && new Date(c.snoozed_until) > new Date() },
  { value: 'client', label: 'Klient', icon: UserCheck, needsDate: false,
    isActive: (c) => c.category === 'client' },
  { value: 'lost', label: 'Utracony', icon: XCircle, needsDate: false,
    isActive: (c) => c.category === 'lost' },
];

interface ContactActionButtonsProps {
  contact: DealTeamContact;
  teamId: string;
  /** Open external snooze dialog */
  onSnooze: () => void;
  /** Open external convert-to-client dialog */
  onConvertToClient: () => void;
  /** Open external meeting-decision dialog */
  onMeetingDone: () => void;
}

/**
 * Always-visible action grid for a contact. Each button creates/updates a task and
 * adjusts category/offering_stage independently of any existing task.
 */
export function ContactActionButtons({ contact, teamId, onSnooze, onConvertToClient, onMeetingDone }: ContactActionButtonsProps) {
  const { director } = useAuth();
  const { data: teamMembers = [] } = useTeamMembers(teamId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateContact = useUpdateTeamContact();

  // Inline date/assignee dialog state
  const [pendingAction, setPendingAction] = useState<ActionDef | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [assignedTo, setAssignedTo] = useState<string>(director?.id || '');
  const [saving, setSaving] = useState(false);

  const c = contact.contact;
  if (!c) return null;

  const handleClick = (action: ActionDef) => {
    if (action.value === 'snooze') { onSnooze(); return; }
    if (action.value === 'client') { onConvertToClient(); return; }
    if (action.value === 'meeting_done') { onMeetingDone(); return; }
    if (action.value === 'ten_x') {
      updateContact.mutate(
        { id: contact.id, teamId, category: '10x' as DealCategory },
        { onSuccess: () => toast.success('Przeniesiono do 10x') }
      );
      return;
    }
    if (action.value === 'lost') {
      // Direct update — no extra data needed
      updateContact.mutate(
        { id: contact.id, teamId, category: 'lost' as DealCategory, status: 'lost' },
        { onSuccess: () => toast.success('Oznaczono jako utracony') }
      );
      return;
    }
    // All other actions need a date
    setDate(undefined);
    setAssignedTo(director?.id || '');
    setPendingAction(action);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    if (pendingAction.needsDate && !date) {
      toast.error('Wybierz datę');
      return;
    }
    setSaving(true);
    try {
      const dateStr = date ? date.toISOString().split('T')[0] : undefined;
      let title = '';
      let newOfferingStage: OfferingStage | undefined;
      let newCategory: DealCategory | undefined;

      switch (pendingAction.value) {
        case 'schedule_meeting':
          title = `Umówić spotkanie z ${c.full_name}`;
          newOfferingStage = 'meeting_plan';
          break;
        case 'meeting_scheduled':
          title = `Spotkanie z ${c.full_name} - ${date ? format(date, 'd MMM', { locale: pl }) : ''}`;
          newOfferingStage = 'meeting_scheduled';
          break;
        case 'send_offer':
          title = `Wysłać ofertę do ${c.full_name}`;
          newOfferingStage = 'handshake';
          newCategory = 'offering';
          break;
        case 'audit':
          title = `Audyt u ${c.full_name} - ${date ? format(date, 'd MMM', { locale: pl }) : ''}`;
          newCategory = 'audit';
          newOfferingStage = 'audit_scheduled';
          break;
        case 'call':
          title = `Zadzwonić do ${c.full_name}`;
          break;
        case 'send_email':
          title = `Wysłać maila do ${c.full_name}`;
          break;
      }

      // Create new task linked to the contact
      await createTask.mutateAsync({
        task: {
          title,
          status: 'todo',
          ...(dateStr ? { due_date: dateStr } : {}),
        },
        contactId: contact.contact_id,
        dealTeamId: teamId,
        dealTeamContactId: contact.id,
        assignedTo: assignedTo || undefined,
      });

      // Update contact category/stage as needed
      const contactUpdate: any = { id: contact.id, teamId };
      if (newOfferingStage) contactUpdate.offeringStage = newOfferingStage;
      if (newCategory) contactUpdate.category = newCategory;
      if (pendingAction.value === 'meeting_scheduled' && dateStr) {
        contactUpdate.nextMeetingDate = dateStr;
      }
      if (pendingAction.value === 'audit') {
        if (dateStr) contactUpdate.nextMeetingDate = dateStr;
        if (assignedTo) contactUpdate.nextMeetingWith = assignedTo;
      }
      if (newOfferingStage || newCategory || contactUpdate.nextMeetingDate) {
        await updateContact.mutateAsync(contactUpdate);
      }

      toast.success(`Akcja dodana: ${title}`);
      setPendingAction(null);
    } catch {
      toast.error('Nie udało się zapisać akcji');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {ACTIONS.map((a) => {
          const active = a.isActive?.(contact) ?? false;
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => handleClick(a)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-xs transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <a.icon className="h-4 w-4" />
              <span className="text-center leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Inline date/assignee dialog for actions that need a date */}
      <Dialog open={!!pendingAction} onOpenChange={(v) => { if (!v) setPendingAction(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingAction?.label}</DialogTitle>
            <DialogDescription>
              Ustaw szczegóły akcji dla {c.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: pl }) : 'Wybierz datę'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)} disabled={saving}>
              Anuluj
            </Button>
            <Button onClick={handleConfirm} disabled={saving || !date}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
