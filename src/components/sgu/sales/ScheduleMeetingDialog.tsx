import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Loader2, CalendarPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useRequireDirector } from '@/hooks/useRequireDirector';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealTeamContactId: string;
  teamId: string;
  contactName: string;
  onScheduled?: (scheduledAt: Date) => void;
}

/**
 * Sprint S7 — DnD Kanban: lead → offering.
 * Wymaga podania daty/godziny pierwszego spotkania (decision_meeting).
 * Cancel = drop wraca (zero DB write).
 */
export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  dealTeamContactId,
  teamId,
  contactName,
  onScheduled,
}: Props) {
  const update = useUpdateTeamContact();
  const { hasDirector } = useRequireDirector(dealTeamContactId);

  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(10, 0, 0, 0);
    return d;
  }, []);

  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [time, setTime] = useState<string>('10:00');

  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      setTime('10:00');
    }
  }, [open, defaultDate]);

  const handleSave = () => {
    if (!date) {
      toast.error('Wybierz datę spotkania');
      return;
    }
    if (!hasDirector) {
      toast.error('Brak przypisanego dyrektora — uzupełnij na karcie kontaktu.');
      return;
    }
    const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) {
      toast.error('Niepoprawna godzina');
      return;
    }
    const scheduled = new Date(date);
    scheduled.setHours(hh, mm, 0, 0);

    update.mutate(
      {
        id: dealTeamContactId,
        teamId,
        category: 'offering',
        offeringStage: 'decision_meeting',
        nextMeetingDate: scheduled.toISOString(),
      },
      {
        onSuccess: () => {
          toast.success(`Spotkanie zaplanowane: ${format(scheduled, 'PPP HH:mm', { locale: pl })}`);
          onScheduled?.(scheduled);
          onOpenChange(false);
        },
        onError: (e: Error) => toast.error(`Błąd: ${e.message}`),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !update.isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" /> Zaplanuj spotkanie
          </DialogTitle>
          <DialogDescription>
            Z {contactName}. Po zapisie kontakt trafi do Ofertowania (etap: spotkanie decyzyjne).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Data spotkania</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground',
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
                  className="p-3 pointer-events-auto"
                  locale={pl}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Godzina</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-32"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={update.isPending || !date}>
            {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz i przenieś
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
