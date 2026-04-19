import { Progress } from '@/components/ui/progress';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { usePremiumProgress } from '@/hooks/usePremiumProgress';
import { Skeleton } from '@/components/ui/skeleton';

interface PremiumProgressProps {
  dealTeamContactId: string;
  compact?: boolean;
}

/**
 * 3-row progress widget for SGU client cards:
 *   Oczekiwany (reference 100%)
 *   Wystawiony (% of expected)
 *   Opłacony   (% of expected)
 */
export function PremiumProgress({ dealTeamContactId, compact }: PremiumProgressProps) {
  const { data, isLoading } = usePremiumProgress(dealTeamContactId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  const expectedGr = data?.expectedGr ?? 0;
  const bookedGr = data?.bookedGr ?? 0;
  const paidGr = data?.paidGr ?? 0;

  if (expectedGr === 0 && bookedGr === 0 && paidGr === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Brak danych premium
      </p>
    );
  }

  const reference = Math.max(expectedGr, bookedGr, paidGr, 1);
  const expectedPct = Math.min(100, Math.round((expectedGr / reference) * 100));
  const bookedPctOfExpected = expectedGr > 0 ? Math.round((bookedGr / expectedGr) * 100) : 0;
  const paidPctOfExpected = expectedGr > 0 ? Math.round((paidGr / expectedGr) * 100) : 0;
  const bookedBarPct = Math.min(100, Math.round((bookedGr / reference) * 100));
  const paidBarPct = Math.min(100, Math.round((paidGr / reference) * 100));

  const labelSize = compact ? 'text-[10px]' : 'text-xs';

  return (
    <div className="space-y-2">
      <Row
        label="Oczekiwany"
        value={formatCompactCurrency(expectedGr / 100)}
        pctLabel={expectedGr > 0 ? '100%' : '—'}
        progressValue={expectedPct}
        indicatorClassName="bg-primary/70"
        labelSize={labelSize}
      />
      <Row
        label="Wystawiony"
        value={formatCompactCurrency(bookedGr / 100)}
        pctLabel={expectedGr > 0 ? `${bookedPctOfExpected}%` : '—'}
        progressValue={bookedBarPct}
        indicatorClassName="bg-amber-500"
        labelSize={labelSize}
      />
      <Row
        label="Opłacony"
        value={formatCompactCurrency(paidGr / 100)}
        pctLabel={expectedGr > 0 ? `${paidPctOfExpected}%` : '—'}
        progressValue={paidBarPct}
        indicatorClassName="bg-emerald-500"
        labelSize={labelSize}
      />
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
  pctLabel: string;
  progressValue: number;
  indicatorClassName: string;
  labelSize: string;
}

function Row({ label, value, pctLabel, progressValue, indicatorClassName, labelSize }: RowProps) {
  return (
    <div className="space-y-1">
      <div className={`flex items-center justify-between ${labelSize}`}>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {value} <span className="text-muted-foreground">({pctLabel})</span>
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all ${indicatorClassName}`}
          style={{ width: `${progressValue}%` }}
        />
      </div>
    </div>
  );
}
