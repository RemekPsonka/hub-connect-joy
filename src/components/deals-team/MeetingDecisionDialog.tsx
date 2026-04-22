import { useEffect, useRef, useState } from 'react';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CalendarIcon, Loader2, ArrowRight, Clock, XCircle, Plus, Trash2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCreateMeetingDecision } from '@/hooks/useMeetingDecisions';
import {
  useMeetingQuestions,
  useCreateMeetingQuestion,
  useAskMeetingQuestionAgain,
  useAnswerMeetingQuestion,
  useSkipMeetingQuestion,
  useDropMeetingQuestion,
  type MeetingQuestionRow,
} from '@/hooks/useMeetingQuestions';

type DecisionType = 'go' | 'postponed' | 'dead';
type QuestionAction = 'askAgain' | 'answer' | 'skip' | 'drop';

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
  const [questionActions, setQuestionActions] = useState<Record<string, QuestionAction>>({});
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [newQuestions, setNewQuestions] = useState<string[]>([]);
  const [newQuestionInput, setNewQuestionInput] = useState('');
  const submitInProgressRef = useRef(false);

  const createDecision = useCreateMeetingDecision();
  const { data: allQuestions = [], isLoading: questionsLoading } = useMeetingQuestions(contactId);
  const askAgain = useAskMeetingQuestionAgain();
  const answerQ  = useAnswerMeetingQuestion();
  const skipQ    = useSkipMeetingQuestion();
  const dropQ    = useDropMeetingQuestion();
  const createQ  = useCreateMeetingQuestion();

  const openQuestions = allQuestions
    .filter((q) => q.status === 'open')
    .sort((a, b) => {
      if (b.ask_count !== a.ask_count) return b.ask_count - a.ask_count;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const anyQuestionPending =
    askAgain.isPending || answerQ.isPending || skipQ.isPending ||
    dropQ.isPending || createQ.isPending;
  const isPending = createDecision.isPending || anyQuestionPending;

  // Reset on open (clears stale state from previous session)
  useEffect(() => {
    if (open) {
      setDecisionType(null);
      setMeetingDate(new Date());
      setNotes('');
      setNextActionDate(undefined);
      setPostponedUntil(undefined);
      setDeadReason('');
      setQuestionActions({});
      setQuestionAnswers({});
      setNewQuestions([]);
      setNewQuestionInput('');
    }
  }, [open]);

  // Reset per-question state ONLY when entering 'dead' mode (different UI).
  // 'go' ↔ 'postponed' preserves user choice (same per-question UI).
  useEffect(() => {
    if (decisionType === 'dead') {
      setQuestionActions({});
      setQuestionAnswers({});
    }
  }, [decisionType]);

  // Default action seeding: askAgain dla każdego open question, jeśli user nie wybrał.
  // Guard !next[q.id] chroni user choice po React Query invalidacji.
  useEffect(() => {
    if (decisionType === 'go' || decisionType === 'postponed') {
      setQuestionActions((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const q of openQuestions) {
          if (!next[q.id]) {
            next[q.id] = 'askAgain';
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionType, openQuestions.length, openQuestions.map((q) => q.id).join(',')]);

  const tomorrow = addDays(new Date(), 1);
  tomorrow.setHours(0, 0, 0, 0);

  const answerValidationOk =
    decisionType === 'dead' ||
    openQuestions.every((q) => {
      const action = questionActions[q.id] ?? 'askAgain';
      if (action !== 'answer') return true;
      return (questionAnswers[q.id] ?? '').trim().length > 0;
    });

  const isValid =
    decisionType !== null &&
    meetingDate instanceof Date &&
    !isNaN(meetingDate.getTime()) &&
    (decisionType !== 'postponed' || (postponedUntil instanceof Date && postponedUntil >= tomorrow)) &&
    (decisionType !== 'dead' || deadReason.trim().length >= 3) &&
    answerValidationOk;

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