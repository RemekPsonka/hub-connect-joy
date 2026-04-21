import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Pencil } from 'lucide-react';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { getClientComplexity } from '@/hooks/useClientComplexity';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';
import { AddExpectedPremiumDialog, type PotentialAreaKey } from './AddExpectedPremiumDialog';

interface Props {
  client: SGUClientRow;
  teamId: string;
}

export function ClientComplexityPanel({ client, teamId }: Props) {
  const result = getClientComplexity(client, {
    potential_property_gr: client.potential_property_gr,
    potential_financial_gr: client.potential_financial_gr,
    potential_communication_gr: client.potential_communication_gr,
    potential_life_group_gr: client.potential_life_group_gr,
  });
  const pct = Math.round((result.greenCount / result.totalAreas) * 100);
  const [editArea, setEditArea] = useState<{ key: PotentialAreaKey; label: string; currentGr: number } | null>(null);

  // Mapowanie kluczy obszarów (z useClientComplexity) → klucze pól potential_*
  const AREA_TO_POTENTIAL: Record<string, PotentialAreaKey> = {
    property_active: 'property',
    financial_active: 'financial',
    communication_active: 'communication',
    life_group_active: 'life_group',
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium">{result.greenCount}/{result.totalAreas} obszarów aktywnych</span>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-2 rounded bg-muted overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {result.areas.map((a) => {
          const potentialKey = AREA_TO_POTENTIAL[a.key as string];
          const potentialGr = a.potentialGr ?? 0;
          const hasPotential = potentialGr > 0;
          return (
            <Card key={a.key} className={cn('p-3 flex items-center gap-3', a.active ? 'border-emerald-500/40 bg-emerald-500/5' : 'opacity-90')}>
              <div className={cn('text-2xl', a.active ? '' : 'grayscale')}>{a.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{a.label}</div>
                <div className="text-xs text-muted-foreground">
                  {a.active ? 'Aktywny' : 'Brak'}
                  {hasPotential && (
                    <> · oczek. <span className="font-medium text-foreground">{formatCompactCurrency(potentialGr / 100)}</span></>
                  )}
                  {typeof a.count === 'number' && a.count > 0 && <> · {a.count}</>}
                </div>
              </div>
              {potentialKey && (
                <Button
                  size="sm"
                  variant={hasPotential ? 'ghost' : 'outline'}
                  onClick={() => setEditArea({ key: potentialKey, label: a.label, currentGr: potentialGr })}
                  className="gap-1 shrink-0"
                  title={hasPotential ? 'Edytuj oczekiwaną składkę' : 'Dodaj oczekiwaną składkę'}
                >
                  {hasPotential ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {hasPotential ? 'Edytuj' : 'Składka'}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {editArea && (
        <AddExpectedPremiumDialog
          open
          onOpenChange={(o) => !o && setEditArea(null)}
          contactId={client.id}
          teamId={teamId}
          areaKey={editArea.key}
          areaLabel={editArea.label}
          currentGr={editArea.currentGr}
          clientName={client.full_name}
        />
      )}
    </div>
  );
}
