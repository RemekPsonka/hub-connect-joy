import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { formatCompactCurrency } from '@/lib/formatCurrency';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contactId: string;
  teamId: string;
  currentGr?: number | null;
  clientName?: string;
}

/**
 * Dialog otwierany po zaznaczeniu K2 (Handshake) w Odprawie.
 * Zapisuje estymowaną roczną składkę (expected_annual_premium_gr).
 * Pole opcjonalne — user może anulować, milestone i category=lead już zapisane.
 */
export function EstimatedPremiumDialog({
  open,
  onOpenChange,
  contactId,
  teamId,
  currentGr,
  clientName,
}: Props) {
  const update = useUpdateTeamContact();
  const [pln, setPln] = useState<string>('');

  useEffect(() => {
    if (open) {
      setPln(currentGr && currentGr > 0 ? String(Math.round(currentGr / 100)) : '');
    }
  }, [open, currentGr]);

  const handleSave = () => {
    const num = Number(pln.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(num) || num < 0) {
      toast.error('Podaj poprawną kwotę');
      return;
    }
    update.mutate(
      { id: contactId, teamId, expectedAnnualPremiumGr: Math.round(num * 100) },
      {
        onSuccess: () => {
          toast.success(`Zapisano estymowaną składkę: ${formatCompactCurrency(num)}`);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🤝</span>Handshake — estymowana składka
          </DialogTitle>
          <DialogDescription>
            {clientName ? `Klient: ${clientName}. ` : ''}Roczna estymowana składka po
            kwalifikacji biznesowej. Możesz pominąć i uzupełnić później.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="estimated-premium-amount">Kwota roczna (PLN)</Label>
          <Input
            id="estimated-premium-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step={100}
            placeholder="np. 5000"
            value={pln}
            onChange={(e) => setPln(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Pomiń
          </Button>
          <Button onClick={handleSave} disabled={update.isPending || !pln}>
            {update.isPending ? 'Zapisywanie…' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}