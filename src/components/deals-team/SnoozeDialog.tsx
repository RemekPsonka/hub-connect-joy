import { useState } from 'react';
import { format, addMonths, addWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Moon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SnoozeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  onSnooze: (until: string, reason: string) => void;
  isPending?: boolean;
}

const quickOptions = [
  { label: '2 tygodnie', getFn: () => addWeeks(new Date(), 2) },
  { label: '1 miesiąc', getFn: () => addMonths(new Date(), 1) },
  { label: '3 miesiące', getFn: () => addMonths(new Date(), 3) },
  { label: '6 miesięcy', getFn: () => addMonths(new Date(), 6) },
];

export function SnoozeDialog({ open, onOpenChange, contactName, onSnooze, isPending }: SnoozeDialogProps) {
  const [date, setDate] = useState<Date | undefined>(addMonths(new Date(), 1));
  const [reason, setReason] = useState('');

  const handleSnooze = () => {
    if (!date) return;
    onSnooze(format(date, 'yyyy-MM-dd'), reason);
    setReason('');
    setDate(addMonths(new Date(), 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Odłóż kontakt
          </DialogTitle>
          <DialogDescription>
            {contactName} zniknie z Kanbana i wróci automatycznie w wybranym terminie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick options */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Szybki wybór</label>
            <div className="flex gap-1.5 flex-wrap">
              {quickOptions.map((opt) => (
                <Button
                  key={opt.label}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setDate(opt.getFn())}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Data powrotu</label>
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
                  {date ? format(date, 'd MMMM yyyy', { locale: pl }) : 'Wybierz datę'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date()}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Powód odłożenia (opcjonalnie)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="np. Polisa kończy się za 8 miesięcy, audyt za 6 miesięcy..."
              className="min-h-[60px] text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSnooze} disabled={!date || isPending}>
            <Moon className="h-3.5 w-3.5 mr-1.5" />
            Odłóż do {date ? format(date, 'd MMM', { locale: pl }) : '...'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
