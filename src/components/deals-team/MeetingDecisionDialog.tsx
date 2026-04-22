import { useEffect, useRef, useState } from 'react';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CalendarIcon, Loader2, ArrowRight, Clock, XCircle,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCreateMeetingDecision } from '@/hooks/useMeetingDecisions';

type DecisionType = 'go' | 'postponed' | 'dead';

interface DecisionOption {
  value: DecisionType;
  label: string;
  description: string;
  icon: typeof ArrowRight;
}

const DECISION_OPTIONS: DecisionOption[] = [
  { value: 'go',        label: 'Idziemy dalej',  description: 'Kontynuujemy proces',     icon: ArrowRight },
  { value: 'postponed', label: 'Odkładamy',       description: 'Wracamy w terminie',     icon: Clock },
  { value: 'dead',      label: 'Rezygnujemy',     description: 'Zamykamy bez sukcesu',   icon: XCircle },
];

interface MeetingDecisionDialogProps {
  contactId: string;
  contactDisplayName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MeetingDecisionDialog({
  contactId, contactDisplayName, open, onOpenChange, onSuccess,
}: MeetingDecisionDialogProps) {
  const [decisionType, setDecisionType] = useState<DecisionType | null>(null);
  const [meetingDate, setMeetingDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [nextActionDate, setNextActionDate] = useState<Date | undefined>(undefined);
  const [postponedUntil, setPostponedUntil] = useState<Date | undefined>(undefined);
  const [deadReason, setDeadReason] = useState('');
  const submitInProgressRef = useRef(false);

  const createDecision = useCreateMeetingDecision();
  const isPending = createDecision.isPending;

  // Reset on open (clears stale state from previous session)
  useEffect(() => {
    if (open) {
      setDecisionType(null);
      setMeetingDate(new Date());
      setNotes('');
      setNextActionDate(undefined);
      setPostponedUntil(undefined);
      setDeadReason('');
    }
  }, [open]);

  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(0, 0, 0, 0);

  const isValid =
    decisionType !== null &&
    meetingDate instanceof Date &&
    !isNaN(meetingDate.getTime()) &&
    (decisionType !== 'postponed' || (postponedUntil instanceof Date && postponedUntil >= tomorrow)) &&
    (decisionType !== 'dead' || deadReason.trim().length >= 3);

  const handleSubmit = async () => {
    if (!decisionType || !isValid || submitInProgressRef.current) return;

    submitInProgressRef.current = true;
    try {
      await createDecision.mutateAsync({
        contactId,
        decisionType,
        meetingDate: format(meetingDate, 'yyyy-MM-dd'),
        notes: notes.trim() || null,
        nextActionDate: decisionType === 'go' && nextActionDate
          ? format(nextActionDate, 'yyyy-MM-dd')
          : null,
        postponedUntil: decisionType === 'postponed' && postponedUntil
          ? format(postponedUntil, 'yyyy-MM-dd')
          : null,
        deadReason: decisionType === 'dead' ? deadReason.trim() : null,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch {
      // Toast already shown by hook onError
    } finally {
      submitInProgressRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isPending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Decyzja po spotkaniu — {contactDisplayName}</DialogTitle>
          <DialogDescription>
            Zarejestruj wynik spotkania i wybierz dalszy kierunek dla kontaktu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Sekcja 1 — meeting date + notes */}
          <div className="space-y-2">
            <Label>Data spotkania *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !meetingDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {meetingDate ? format(meetingDate, 'd MMMM yyyy', { locale: pl }) : 'Wybierz datę'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={meetingDate}
                  onSelect={(d) => d && setMeetingDate(d)}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Notatka ze spotkania</Label>
            <Textarea
              placeholder="Notatka ze spotkania (opcjonalna)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Sekcja 2 — wybór typu decyzji */}
          <div className="space-y-2">
            <Label>Decyzja *</Label>
            <div className="grid grid-cols-3 gap-2">
              {DECISION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDecisionType(opt.value)}
                  className={cn(
                    'flex items-start gap-2 p-3 rounded-lg border text-left transition-colors',
                    decisionType === opt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <opt.icon className={cn(
                    'h-4 w-4 mt-0.5 shrink-0',
                    decisionType === opt.value ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sekcja 3 — conditional fields */}
          {decisionType === 'go' && (
            <div className="space-y-2">
              <Label>Następna akcja (opcjonalnie)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !nextActionDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextActionDate
                      ? format(nextActionDate, 'd MMMM yyyy', { locale: pl })
                      : 'Wybierz datę'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={nextActionDate}
                    onSelect={setNextActionDate}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {decisionType === 'postponed' && (
            <div className="space-y-2">
              <Label>Przełóż do *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !postponedUntil && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {postponedUntil
                      ? format(postponedUntil, 'd MMMM yyyy', { locale: pl })
                      : 'Wybierz datę'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={postponedUntil}
                    onSelect={setPostponedUntil}
                    disabled={(d) => d < tomorrow}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {decisionType === 'dead' && (
            <div className="space-y-2">
              <Label>Powód rezygnacji *</Label>
              <Textarea
                placeholder="Dlaczego zamykamy ten kontakt?"
                value={deadReason}
                onChange={(e) => setDeadReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isPending ? 'Zapisuję...' : 'Zapisz decyzję'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}