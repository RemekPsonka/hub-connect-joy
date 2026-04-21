import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import type { UpdateTeamContactInput } from '@/types/dealTeam';

export type PotentialAreaKey = 'property' | 'financial' | 'communication' | 'life_group';

const FIELD_MAP: Record<PotentialAreaKey, keyof UpdateTeamContactInput> = {
  property: 'potentialPropertyGr',
  financial: 'potentialFinancialGr',
  communication: 'potentialCommunicationGr',
  life_group: 'potentialLifeGroupGr',
};

const ICON_MAP: Record<PotentialAreaKey, string> = {
  property: '🏠',
  financial: '💰',
  communication: '📞',
  life_group: '🏥',
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contactId: string;
  teamId: string;
  areaKey: PotentialAreaKey;
  areaLabel: string;
  /** Aktualna wartość w groszach (do edycji) */
  currentGr?: number | null;
  clientName?: string;
}

export function AddExpectedPremiumDialog({
  open,
  onOpenChange,
  contactId,
  teamId,
  areaKey,
  areaLabel,
  currentGr,
  clientName,
}: Props) {
  const updateContact = useUpdateTeamContact();
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
    const gr = Math.round(num * 100);
    const field = FIELD_MAP[areaKey];
    updateContact.mutate(
      { id: contactId, teamId, [field]: gr } as UpdateTeamContactInput,
      {
        onSuccess: () => {
          toast.success(`Zapisano oczekiwaną składkę: ${formatCompactCurrency(num)}`);
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
            <span className="text-xl">{ICON_MAP[areaKey]}</span>
            Oczekiwana składka — {areaLabel}
          </DialogTitle>
          <DialogDescription>
            {clientName ? `Klient: ${clientName}. ` : ''}Roczna oczekiwana składka w obszarze {areaLabel.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="premium-amount">Kwota roczna (PLN)</Label>
          <Input
            id="premium-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step={100}
            placeholder="np. 5000"
            value={pln}
            onChange={(e) => setPln(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Wpisz 0, aby usunąć oczekiwaną składkę dla tego obszaru.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateContact.isPending}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={updateContact.isPending}>
            {updateContact.isPending ? 'Zapisywanie…' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}