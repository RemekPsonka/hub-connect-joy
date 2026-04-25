import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSguStageTransition } from '@/hooks/useSguStageTransition';
import type { PremiumDialogContext } from './EstimatedPremiumDialog';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; ctx: PremiumDialogContext | null; }

/**
 * Etap `audit_scheduled` → `audit_done`.
 * Aktualizacja oczekiwanych składek po audycie (opcjonalnie).
 * Tworzy task „Aktualizacja składek po audycie / Wyślij ofertę".
 */
export function AuditDoneDialog({ open, onOpenChange, ctx }: Props) {
  const [premium, setPremium] = useState('');
  const transition = useSguStageTransition();

  if (!ctx) return null;

  const handleSave = async () => {
    const patch: Record<string, unknown> = { audit_done_at: new Date().toISOString() };
    if (premium) {
      const value = Number(premium.replace(/\s/g, '').replace(',', '.'));
      if (Number.isFinite(value) && value > 0) {
        patch.expected_annual_premium_gr = Math.round(value * 100);
      }
    }
    await transition.mutateAsync({
      teamId: ctx.teamId,
      teamContactId: ctx.teamContactId,
      contactId: ctx.contactId,
      contactName: ctx.contactName,
      contactCompany: ctx.contactCompany,
      nextStage: 'audit_done',
      sourceTaskId: ctx.sourceTaskId,
      contactPatch: patch,
    });
    setPremium('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Audyt zakończony
          </DialogTitle>
          <DialogDescription>
            Możesz skorygować oczekiwane składki dla {ctx.contactName} po audycie.
            Następnie utworzymy zadanie „Wyślij ofertę".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="premium">Zaktualizowana składka roczna (PLN, opcjonalnie)</Label>
          <Input id="premium" inputMode="decimal" placeholder="np. 14 500" value={premium} onChange={(e) => setPremium(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={transition.isPending}>Anuluj</Button>
          <Button onClick={handleSave} disabled={transition.isPending}>
            {transition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz i przejdź do oferty
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
