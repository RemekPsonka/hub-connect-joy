import { useState } from 'react';
import { Loader2, FileText, CalendarIcon, TrendingUp, Moon, UserCheck, XCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useCreateTask } from '@/hooks/useTasks';
import { toast } from 'sonner';
import type { DealCategory } from '@/types/dealTeam';
import { SovraOpenButton } from '@/components/sovra/SovraOpenButton';

type OutcomeOption = 'offer' | 'next_meeting' | '10x' | 'snooze' | 'client' | 'lost';

interface MeetingOutcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactId: string;
  teamContactId: string;
  teamId: string;
  currentCategory: DealCategory;
  onConfirm?: () => void;
  /** Open the snooze dialog externally */
  onSnooze?: () => void;
  /** Open the convert-to-client dialog externally */
  onConvertToClient?: () => void;
}

const OPTIONS: { value: OutcomeOption; label: string; description: string; icon: typeof FileText }[] = [
  { value: 'offer', label: 'Wyślij ofertę', description: 'Przenieś do Ofertowania (handshake)', icon: FileText },
  { value: 'next_meeting', label: 'Kolejne spotkanie', description: 'Umów kolejne spotkanie', icon: CalendarIcon },
  { value: '10x', label: '10x', description: 'Przenieś do kategorii 10x', icon: TrendingUp },
  { value: 'snooze', label: 'Odłóż', description: 'Odłóż kontakt na później', icon: Moon },
  { value: 'client', label: 'Klient', description: 'Konwertuj na klienta', icon: UserCheck },
  { value: 'lost', label: 'Utracony', description: 'Oznacz jako przegrany', icon: XCircle },
];

export function MeetingOutcomeDialog({
  open, onOpenChange, contactName, contactId, teamContactId, teamId,
  currentCategory, onConfirm, onSnooze, onConvertToClient,
}: MeetingOutcomeDialogProps) {
  const [selected, setSelected] = useState<OutcomeOption | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const updateContact = useUpdateTeamContact();
  const createTask = useCreateTask();

  const handleConfirm = async () => {
    if (!selected) return;

    // Handle external dialogs first
    if (selected === 'snooze') {
      onOpenChange(false);
      onSnooze?.();
      return;
    }
    if (selected === 'client') {
      onOpenChange(false);
      onConvertToClient?.();
      return;
    }

    setSaving(true);
    try {
      // Update contact stage to meeting_done first
      await updateContact.mutateAsync({
        id: teamContactId,
        teamId,
        offeringStage: 'meeting_done',
        ...(note ? { notes: note } : {}),
      });

      switch (selected) {
        case 'offer':
          await updateContact.mutateAsync({
            id: teamContactId,
            teamId,
            category: 'offering',
            offeringStage: 'handshake',
          });
          break;

        case 'next_meeting':
          // Reset to meeting_plan and create new task
          await updateContact.mutateAsync({
            id: teamContactId,
            teamId,
            offeringStage: 'meeting_plan',
          });
          await createTask.mutateAsync({
            task: {
              title: `Umówić spotkanie z ${contactName}`,
              status: 'todo',
            },
            contactId,
            dealTeamId: teamId,
            dealTeamContactId: teamContactId,
          });
          break;

        case '10x':
          await updateContact.mutateAsync({
            id: teamContactId,
            teamId,
            category: '10x',
          });
          break;

        case 'lost':
          await updateContact.mutateAsync({
            id: teamContactId,
            teamId,
            status: 'lost',
            category: 'lost',
          });
          break;
      }

      toast.success('Zapisano wynik spotkania');
      onConfirm?.();
      onOpenChange(false);
      // Reset
      setSelected(null);
      setNote('');
    } catch {
      toast.error('Nie udało się zapisać');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">
              <DialogTitle>Spotkanie odbyte — co dalej?</DialogTitle>
              <DialogDescription>
                Spotkanie z {contactName} zakończone. Wybierz dalsze kroki.
              </DialogDescription>
            </div>
            <SovraOpenButton scopeType="contact" scopeId={contactId} />
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map((opt) => (
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

          <div className="space-y-2">
            <Label>Notatka (opcjonalnie)</Label>
            <Textarea
              placeholder="Wnioski ze spotkania..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Anuluj
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !selected}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zatwierdź
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
