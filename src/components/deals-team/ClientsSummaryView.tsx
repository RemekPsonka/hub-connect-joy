import { useMemo } from 'react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useAllTeamClientProducts, useAllTeamForecasts } from '@/hooks/useTeamClients';
import { formatCompactCurrency, formatCurrency } from '@/lib/formatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientsSummaryViewProps {
  teamId: string;
}

export function ClientsSummaryView({ teamId }: ClientsSummaryViewProps) {
  const { data: allProducts = [], isLoading: prodLoading } = useAllTeamClientProducts(teamId);
  const { data: allForecasts = [], isLoading: fcLoading } = useAllTeamForecasts(teamId);

  // Per category summary
  const categorySummary = useMemo(() => {
    const map = new Map<string, { name: string; color: string; value: number; commission: number }>();
    allProducts.forEach((p) => {
      const key = p.product_category_id;
      const existing = map.get(key) || {
        name: p.category_name || 'Inne',
        color: p.category_color || '#6366f1',
        value: 0,
        commission: 0,
      };
      existing.value += p.deal_value;
      existing.commission += p.expected_commission;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [allProducts]);

  const totalValue = categorySummary.reduce((s, c) => s + c.value, 0);
  const totalCommission = categorySummary.reduce((s, c) => s + c.commission, 0);

  // Monthly forecast
  const monthlyForecast = useMemo(() => {
    const now = startOfMonth(new Date());
    const months = Array.from({ length: 12 }, (_, i) => ({
      date: addMonths(now, i),
      label: format(addMonths(now, i), 'LLL yy', { locale: pl }),
      amount: 0,
    }));
    allForecasts.forEach((f: any) => {
      if (f.month_offset >= 0 && f.month_offset < 12) {
        months[f.month_offset].amount += f.amount;
      }
    });
    return months;
  }, [allForecasts]);

  if (prodLoading || fcLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Category summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Podsumowanie per grupa produktów</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categorySummary.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="flex-1 font-medium">{cat.name}</span>
                <span className="font-semibold">{formatCompactCurrency(cat.value)}</span>
                {cat.commission > 0 && (
                  <span className="text-emerald-600 text-xs">{formatCompactCurrency(cat.commission)} prow.</span>
                )}
              </div>
            ))}
            {categorySummary.length > 0 && (
              <div className="flex items-center gap-3 text-sm pt-2 border-t font-bold">
                <span className="flex-1">RAZEM</span>
                <span>{formatCompactCurrency(totalValue)}</span>
                {totalCommission > 0 && (
                  <span className="text-emerald-600 text-xs">{formatCompactCurrency(totalCommission)} prow.</span>
                )}
              </div>
            )}
            {categorySummary.length === 0 && (
              <p className="text-sm text-muted-foreground">Brak danych</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly forecast */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Prognoza miesięczna</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {monthlyForecast.map((m) => (
              <div key={m.label} className="text-center p-2 rounded-lg border bg-muted/30">
                <p className="text-xs text-muted-foreground capitalize">{m.label}</p>
                <p className={`text-sm font-semibold mt-1 ${m.amount > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {m.amount > 0 ? formatCompactCurrency(m.amount) : '—'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right text-sm">
            <span className="text-muted-foreground">Razem 12 mies.: </span>
            <span className="font-bold">{formatCurrency(monthlyForecast.reduce((s, m) => s + m.amount, 0))}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
