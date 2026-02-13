import { useMemo } from 'react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useAllTeamClientProducts, useAllTeamForecasts } from '@/hooks/useTeamClients';
import { formatCompactCurrency, formatCurrency } from '@/lib/formatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

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

  const forecastChartConfig: ChartConfig = {
    amount: { label: 'Kwota', color: '#10b981' },
  };

  const pieData = useMemo(
    () => categorySummary.map((c) => ({ name: c.name, value: c.value, fill: c.color })),
    [categorySummary]
  );
  const pieConfig: ChartConfig = Object.fromEntries(
    categorySummary.map((c) => [c.name, { label: c.name, color: c.color }])
  );

  if (prodLoading || fcLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Category summary with PieChart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Podsumowanie per grupa produktów</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Legend list */}
            <div className="space-y-2 flex-1">
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
            {/* PieChart */}
            {pieData.length > 0 && (
              <div className="w-full lg:w-48 flex-shrink-0">
                <ChartContainer config={pieConfig} className="h-[160px] w-full aspect-auto">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={30}>
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly forecast BarChart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Prognoza miesięczna</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={forecastChartConfig} className="h-[220px] w-full aspect-auto">
            <BarChart data={monthlyForecast} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ChartContainer>
          <div className="mt-3 text-right text-sm">
            <span className="text-muted-foreground">Razem 12 mies.: </span>
            <span className="font-bold">{formatCurrency(monthlyForecast.reduce((s, m) => s + m.amount, 0))}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
