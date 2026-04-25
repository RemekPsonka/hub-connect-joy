import { useEffect, useMemo, useState } from 'react';
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
import type { UpdateTeamContactInput } from '@/types/dealTeam';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contactId: string;
  teamId: string;
  current?: {
    property?: number | null;
    financial?: number | null;
    communication?: number | null;
    life_group?: number | null;
  };
  clientName?: string;
}

const AREAS = [
  { key: 'property', label: 'Majątek', icon: '🏠', field: 'potentialPropertyGr' as const },
  { key: 'financial', label: 'Finanse', icon: '💰', field: 'potentialFinancialGr' as const },
  { key: 'communication', label: 'Komunikacja', icon: '📞', field: 'potentialCommunicationGr' as const },
  { key: 'life_group', label: 'Życie / Grupa', icon: '🏥', field: 'potentialLifeGroupGr' as const },
] as const;

const toPln = (gr?: number | null) => (gr && gr > 0 ? String(Math.round(gr / 100)) : '');
const parsePln = (s: string) => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Dialog otwierany po zaznaczeniu K4 (Klient) w Odprawie.
 * Zapisuje 4 obszary składki (property/financial/communication/life_group)
 * jednym mutate. Re-używa logiki AddExpectedPremiumDialog, ale na 1 ekranie.
 */
export function WonPremiumBreakdownDialog({
  open,
  onOpenChange,
  contactId,
  teamId,
  current,
  clientName,
}: Props) {
  const update = useUpdateTeamContact();
  const [values, setValues] = useState<Record<string, string>>({
    property: '',
    financial: '',
    communication: '',
    life_group: '',
  });

  useEffect(() => {
    if (open) {
      setValues({
        property: toPln(current?.property),
        financial: toPln(current?.financial),
        communication: toPln(current?.communication),
        life_group: toPln(current?.life_group),
      });
    }
    // Stable primitive deps — `current` jest tworzone inline w parent i miałoby nową
    // referencję przy każdym renderze, co kasowałoby wpisane wartości.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    current?.property,
    current?.financial,
    current?.communication,
    current?.life_group,
  ]);

  const totalPln = useMemo(
    () => AREAS.reduce((sum, a) => sum + parsePln(values[a.key]), 0),
    [values],
  );

  const handleSave = () => {
    if (totalPln <= 0) {
      toast.error('Wpisz przynajmniej jedną kwotę');
      return;
    }
    const payload: UpdateTeamContactInput = {
      id: contactId,
      teamId,
      potentialPropertyGr: Math.round(parsePln(values.property) * 100),
      potentialFinancialGr: Math.round(parsePln(values.financial) * 100),
      potentialCommunicationGr: Math.round(parsePln(values.communication) * 100),
      potentialLifeGroupGr: Math.round(parsePln(values.life_group) * 100),
    };
    update.mutate(payload, {
      onSuccess: () => {
        toast.success(`Zapisano składki klienta: ${formatCompactCurrency(totalPln)}`);
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🏆</span>Klient — składki w 4 obszarach
          </DialogTitle>
          <DialogDescription>
            {clientName ? `${clientName}. ` : ''}Wpisz roczne składki dla każdego
            obszaru. Możesz pominąć i uzupełnić później.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {AREAS.map((a) => (
            <div key={a.key} className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label htmlFor={`won-${a.key}`} className="flex items-center gap-2 text-sm">
                <span>{a.icon}</span>
                {a.label}
              </Label>
              <Input
                id={`won-${a.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={100}
                placeholder="0"
                value={values[a.key]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [a.key]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">Suma roczna:</span>
            <span className="font-semibold tabular-nums">
              {formatCompactCurrency(totalPln)}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Pomiń
          </Button>
          <Button onClick={handleSave} disabled={update.isPending || totalPln <= 0}>
            {update.isPending ? 'Zapisywanie…' : 'Zapisz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}