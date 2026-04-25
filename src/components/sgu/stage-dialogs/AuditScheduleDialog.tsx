import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2, ClipboardCheck, CalendarIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSguStageTransition } from '@/hooks/useSguStageTransition';
import type { PremiumDialogContext } from './EstimatedPremiumDialog';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; ctx: PremiumDialogContext | null; }

/** Etap `audit_scheduled` → `audit_done`. Pole: data audytu. */
export function AuditScheduleDialog({ open, onOpenChange, ctx }: Props) {
  const [auditDate, setAuditDate] = useState<Date | undefined>(undefined);
  const transition = useSguStageTransition();

  if (!ctx) return null;

  const handleSave = async () => {
    if (!auditDate) return;
    const dueIso = auditDate.toISOString().slice(0, 10);
    // Zostawiamy etap = audit_scheduled (nie zmieniamy), tylko zamykamy task „Umów audyt"
    // i tworzymy nowy task na dzień audytu z tytułem „Audyt — …".
    await transition.mutateAsync({
      teamId: ctx.teamId,
      teamContactId: ctx.teamContactId,
      contactId: ctx.contactId,
      contactName: ctx.contactName,
      contactCompany: ctx.contactCompany,
      // Po audycie kontakt przejdzie do audit_done — robimy to dopiero po faktycznym audycie
      // (osobny dialog AuditDoneDialog). Tu tylko aktualizujemy datę i zostawiamy etap.
      nextStage: 'audit_scheduled',
      sourceTaskId: ctx.sourceTaskId,
      newTaskDueDate: dueIso,
      contactPatch: { next_meeting_date: dueIso, next_action: 'Audyt zaplanowany' },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" /> Umów audyt
          </DialogTitle>
          <DialogDescription>Wybierz datę audytu dla {ctx.contactName}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Data audytu</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !auditDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {auditDate ? format(auditDate, 'PPP', { locale: pl }) : 'Wybierz datę'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={auditDate} onSelect={setAuditDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={transition.isPending}>Anuluj</Button>
          <Button onClick={handleSave} disabled={transition.isPending || !auditDate}>
            {transition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz datę audytu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
