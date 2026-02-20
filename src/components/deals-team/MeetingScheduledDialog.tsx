import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useCreateTask } from '@/hooks/useTasks';
import { toast } from 'sonner';

interface MeetingScheduledDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactId: string;
  teamContactId: string;
  teamId: string;
  /** Called after successful save, with taskId to mark as completed */
  onConfirm?: () => void;
}

export function MeetingScheduledDialog({
  open, onOpenChange, contactName, contactId, teamContactId, teamId, onConfirm,
}: MeetingScheduledDialogProps) {
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [meetingWith, setMeetingWith] = useState('');
  const [saving, setSaving] = useState(false);

  const updateContact = useUpdateTeamContact();
  const createTask = useCreateTask();

  const handleSave = async () => {
    if (!meetingDate) {
      toast.error('Wybierz datę spotkania');
      return;
    }
    setSaving(true);
    try {
      const dateStr = meetingDate.toISOString().split('T')[0];

      // 1. Update contact stage to meeting_scheduled + set next_meeting_date
      await updateContact.mutateAsync({
        id: teamContactId,
        teamId,
        offeringStage: 'meeting_scheduled',
        nextMeetingDate: dateStr,
        nextMeetingWith: meetingWith || null,
      });

      // 2. Create follow-up task "Spotkanie z [Name]" on that date
      const taskTitle = `Spotkanie z ${contactName}${meetingWith ? ` (${meetingWith})` : ''} - ${format(meetingDate, 'd MMM', { locale: pl })}`;
      await createTask.mutateAsync({
        task: {
          title: taskTitle,
          status: 'todo',
          due_date: dateStr,
        },
        contactId,
        dealTeamId: teamId,
        dealTeamContactId: teamContactId,
      });

      toast.success('Spotkanie umówione');
      onConfirm?.();
      onOpenChange(false);
      // Reset
      setMeetingDate(undefined);
      setMeetingWith('');
    } catch {
      toast.error('Nie udało się zapisać');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Spotkanie umówione</DialogTitle>
          <DialogDescription>
            Podaj datę spotkania z {contactName}. System automatycznie utworzy zadanie na ten dzień.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Data spotkania *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !meetingDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {meetingDate ? format(meetingDate, 'PPP', { locale: pl }) : 'Wybierz datę'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={meetingDate}
                  onSelect={setMeetingDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Z kim? (opcjonalnie)</Label>
            <Input
              placeholder="np. Jan Kowalski, CEO"
              value={meetingWith}
              onChange={(e) => setMeetingWith(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={saving || !meetingDate}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
