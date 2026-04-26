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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useConvertToClient, type ConvertToClientAreas } from '@/hooks/useConvertToClient';
import { formatCompactCurrency } from '@/lib/formatCurrency';

type AreaKey = 'property' | 'financial' | 'communication' | 'life_group';

interface CurrentPotentials {
  property?: number | null;
  financial?: number | null;
  communication?: number | null;
  life_group?: number | null;
  // Optional: pre-selected active flags. Jeśli nie podane — heurystyka: składka>0 ⇒ active.
  property_active?: boolean | null;
  financial_active?: boolean | null;
  communication_active?: boolean | null;
  life_group_active?: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contactId: string;
  // Pozostawione w props dla kompatybilności z istniejącymi callerami; nie jest wymagane przez RPC.
  teamId?: string;
  current?: CurrentPotentials;
  clientName?: string;
  onSuccess?: () => void;
}

const AREAS: { key: AreaKey; label: string; icon: string }[] = [
  { key: 'property', label: 'Majątek', icon: '🏠' },
  { key: 'financial', label: 'Finanse', icon: '💰' },
  { key: 'communication', label: 'Komunikacja', icon: '📞' },
  { key: 'life_group', label: 'Grupowe na życie', icon: '🏥' },
];

const grToPlnString = (gr?: number | null): string =>
  gr && gr > 0 ? String(Math.round(gr / 100)) : '';

const parsePln = (s: string): number => {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Sprint S2 — UNIFY-CONVERT-CLIENT.
 * Jeden canonical dialog konwersji prospekt → klient, używany ze wszystkich
 * entry-pointów (Odprawa K4, Kanban DnD offering→client, Offering "Won",
 * ContactTasksSheet, MyTeamTasksView, TaskDetailSheet).
 *
 * 4 sekcje stałe (Majątek/Finanse/Komunikacja/Grupowe na życie):
 *   - Checkbox "Klient ma ten obszar"
 *   - Input "Roczna składka (PLN)"
 *
 * Walidacja: min. 1 checkbox aktywny — submit disabled gdy 0.
 * Submit → RPC convert_to_client (atomowo: category, won_at, offering_stage,
 * client_complexity JSON, 4 bigint potencjały, expected_annual_premium_gr).
 */
export function WonPremiumBreakdownDialog({
  open,
  onOpenChange,
  contactId,
  current,
  clientName,
  onSuccess,
}: Props) {
  const convertToClient = useConvertToClient();
  const [active, setActive] = useState<Record<AreaKey, boolean>>({
    property: false,
    financial: false,
    communication: false,
    life_group: false,
  });
  const [premiums, setPremiums] = useState<Record<AreaKey, string>>({
    property: '',
    financial: '',
    communication: '',
    life_group: '',
  });

  useEffect(() => {
    if (!open) return;
    const inferActive = (key: AreaKey): boolean => {
      const explicit = current?.[`${key}_active` as keyof CurrentPotentials];
      if (typeof explicit === 'boolean') return explicit;
      const gr = current?.[key];
      return typeof gr === 'number' && gr > 0;
    };
    setActive({
      property: inferActive('property'),
      financial: inferActive('financial'),
      communication: inferActive('communication'),
      life_group: inferActive('life_group'),
    });
    setPremiums({
      property: grToPlnString(current?.property),
      financial: grToPlnString(current?.financial),
      communication: grToPlnString(current?.communication),
      life_group: grToPlnString(current?.life_group),
    });
    // Stable primitive deps (current tworzony inline w parentach).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    current?.property,
    current?.financial,
    current?.communication,
    current?.life_group,
    current?.property_active,
    current?.financial_active,
    current?.communication_active,
    current?.life_group_active,
  ]);

  const activeCount = AREAS.reduce((n, a) => n + (active[a.key] ? 1 : 0), 0);
  const totalPln = useMemo(
    () =>
      AREAS.reduce(
        (sum, a) => sum + (active[a.key] ? parsePln(premiums[a.key]) : 0),
        0,
      ),
    [active, premiums],
  );

  const handleSave = async () => {
    if (activeCount === 0) {
      toast.error('Konwersja na klienta wymaga zaznaczenia minimum jednego obszaru.');
      return;
    }
    const areas: ConvertToClientAreas = {
      property: { active: active.property, annualPremiumPln: parsePln(premiums.property) },
      financial: { active: active.financial, annualPremiumPln: parsePln(premiums.financial) },
      communication: {
        active: active.communication,
        annualPremiumPln: parsePln(premiums.communication),
      },
      life_group: {
        active: active.life_group,
        annualPremiumPln: parsePln(premiums.life_group),
      },
    };
    try {
      await convertToClient.mutateAsync({ dealTeamContactId: contactId, areas });
      toast.success('Klient zarejestrowany');
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się zapisać konwersji';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🏆</span>Klient — obszary i roczne składki
          </DialogTitle>
          <DialogDescription>
            {clientName ? `${clientName}. ` : ''}Zaznacz obszary, w których klient
            ma realne potrzeby i wpisz roczną składkę szacunkową w PLN. Minimum
            jeden obszar wymagany.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {AREAS.map((a) => {
            const isActive = active[a.key];
            return (
              <div
                key={a.key}
                className={`rounded-md border p-3 transition-colors ${
                  isActive ? 'border-primary/40 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`area-${a.key}`}
                    checked={isActive}
                    onCheckedChange={(v) =>
                      setActive((prev) => ({ ...prev, [a.key]: v === true }))
                    }
                  />
                  <Label
                    htmlFor={`area-${a.key}`}
                    className="flex flex-1 items-center gap-2 text-sm cursor-pointer"
                  >
                    <span>{a.icon}</span>
                    {a.label}
                  </Label>
                </div>
                <div className="mt-2 grid grid-cols-[140px_1fr] items-center gap-3">
                  <Label
                    htmlFor={`premium-${a.key}`}
                    className="text-xs text-muted-foreground"
                  >
                    Roczna składka (PLN)
                  </Label>
                  <Input
                    id={`premium-${a.key}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={100}
                    placeholder="0"
                    value={premiums[a.key]}
                    disabled={!isActive}
                    onChange={(e) =>
                      setPremiums((prev) => ({ ...prev, [a.key]: e.target.value }))
                    }
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">Suma roczna:</span>
            <span className="font-semibold tabular-nums">
              {formatCompactCurrency(totalPln)}
            </span>
          </div>
          {activeCount === 0 && (
            <p className="text-xs text-destructive">
              Zaznacz przynajmniej jeden obszar, żeby zapisać klienta.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={convertToClient.isPending}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={convertToClient.isPending || activeCount === 0}
          >
            {convertToClient.isPending ? 'Zapisywanie…' : 'Zapisz klienta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
