import { useState } from 'react';
import { Loader2, Banknote } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSguStageTransition } from '@/hooks/useSguStageTransition';

export interface PremiumDialogContext {
  contactName: string;
  contactCompany?: string | null;
  contactId: string;
  teamContactId: string;
  teamId: string;
  sourceTaskId: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: PremiumDialogContext | null;
}

/**
 * Etap `handshake` → `power_of_attorney`.
 * Pole: oczekiwana składka roczna (PLN, brutto). Po audycie aktualizowane ponownie.
 */
export function EstimatedPremiumDialog({ open, onOpenChange, ctx }: Props) {
  const [premium, setPremium] = useState<string>('');
  const transition = useSguStageTransition();

  if (!ctx) return null;

  const handleSave = async () => {
    const value = Number(premium.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;
    const gr = Math.round(value * 100);
    await transition.mutateAsync({
      teamId: ctx.teamId,
      teamContactId: ctx.teamContactId,
      contactId: ctx.contactId,
      contactName: ctx.contactName,
      contactCompany: ctx.contactCompany,
      nextStage: 'power_of_attorney',
      sourceTaskId: ctx.sourceTaskId,
      contactPatch: { expected_annual_premium_gr: gr },
    });
    setPremium('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" /> Oczekiwane składki
          </DialogTitle>
          <DialogDescription>
            Wpisz szacowaną roczną składkę dla {ctx.contactName}
            {ctx.contactCompany ? ` (${ctx.contactCompany})` : ''}. Po audycie
            będziesz mógł ją skorygować.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="premium">Składka roczna (PLN)</Label>
          <Input
            id="premium"
            inputMode="decimal"
            placeholder="np. 12 000"
            value={premium}
            onChange={(e) => setPremium(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={transition.isPending}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={transition.isPending || !premium}>
            {transition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz i przejdź do pełnomocnictwa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
