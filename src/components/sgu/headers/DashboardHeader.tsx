import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FileCheck, Wallet, Coins, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { useSGUWeeklyKPI } from '@/hooks/useSGUWeeklyKPI';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';

type Period = 'week' | 'month' | 'quarter';

function deltaPct(curr: number, prev: number): { pct: number; up: boolean } | null {
  if (!prev) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

export function DashboardHeader() {
  const [period, setPeriod] = useState<Period>('week');
  // Period currently always uses weekly RPC (only one available); future: monthly/quarterly.
  const { data: kpi, isLoading } = useSGUWeeklyKPI(0);

  const policies = Number(kpi?.policies_issued_count ?? 0);
  const booked = Number(kpi?.premium_collected_gr ?? 0); // booked proxy for now
  const collected = Number(kpi?.premium_collected_gr ?? 0);
  const commission = Number(kpi?.commission_earned_gr ?? 0);

  const policiesT = deltaPct(policies, Number(kpi?.prev_policies_issued_count ?? 0));
  const collectedT = deltaPct(collected, Number(kpi?.prev_premium_collected_gr ?? 0));
  const commissionT = deltaPct(commission, Number(kpi?.prev_commission_earned_gr ?? 0));

  const items = [
    { label: 'Nowe polisy', value: isLoading ? '—' : String(policies), trend: policiesT, icon: FileCheck, tone: 'text-emerald-600' },
    { label: 'Przypis Booked', value: isLoading ? '—' : formatCompactCurrency(booked / 100), trend: null, icon: Landmark, tone: 'text-sky-600' },
    { label: 'Collected', value: isLoading ? '—' : formatCompactCurrency(collected / 100), trend: collectedT, icon: Wallet, tone: 'text-violet-600' },
    { label: 'Prowizja', value: isLoading ? '—' : formatCompactCurrency(commission / 100), trend: commissionT, icon: Coins, tone: 'text-amber-600' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v as Period)} size="sm">
          <ToggleGroupItem value="week">Tydzień</ToggleGroupItem>
          <ToggleGroupItem value="month" disabled>
            Miesiąc
          </ToggleGroupItem>
          <ToggleGroupItem value="quarter" disabled>
            Kwartał
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <Card key={it.label}>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{it.label}</span>
                <it.icon className={cn('h-4 w-4', it.tone)} />
              </div>
              <div className="text-2xl font-semibold tabular-nums">{it.value}</div>
              {it.trend && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {it.trend.up ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span>{it.trend.up ? '+' : '−'}{it.trend.pct}% vs. poprzedni</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
