import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTeamClients, useAllTeamClientProducts, useAllTeamForecasts } from '@/hooks/useTeamClients';
import { useActualCommissions, useUpsertActualCommission } from '@/hooks/useCommissions';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { format, startOfYear, addMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CommissionsTabProps {
  teamId: string;
}

const MONTHS_LABELS = Array.from({ length: 12 }, (_, i) => {
  const d = addMonths(new Date(2026, 0, 1), i);
  return format(d, 'LLL', { locale: pl });
});

function getVarianceColor(pct: number) {
  if (pct >= 90) return 'text-emerald-600';
  if (pct >= 80) return 'text-amber-600';
  return 'text-destructive';
}

function getVarianceBg(pct: number) {
  if (pct >= 90) return 'bg-emerald-50 dark:bg-emerald-950/20';
  if (pct >= 80) return 'bg-amber-50 dark:bg-amber-950/20';
  return 'bg-red-50 dark:bg-red-950/20';
}

export function CommissionsTab({ teamId }: CommissionsTabProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: clients = [] } = useTeamClients(teamId);
  const { data: allProducts = [] } = useAllTeamClientProducts(teamId);
  const { data: allForecasts = [] } = useAllTeamForecasts(teamId);
  const { data: actualCommissions = [] } = useActualCommissions(teamId, year);
  const upsertMutation = useUpsertActualCommission();

  // Editing state for monthly table
  const [editingCell, setEditingCell] = useState<{ month: number; field: 'premium' | 'commission' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Client products that belong to clients only
  const clientProducts = useMemo(() => {
    const clientIds = new Set(clients.map((c) => c.id));
    return allProducts.filter((p) => clientIds.has(p.team_contact_id));
  }, [allProducts, clients]);

  // Monthly forecast data from revenue forecasts (only client products)
  const monthlyForecasts = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({
      forecastPremium: 0,
      forecastCommission: 0,
    }));

    const clientProductIds = new Set(clientProducts.map((p) => p.id));

    allForecasts.forEach((f: any) => {
      if (!clientProductIds.has(f.client_product_id)) return;
      const monthDate = new Date(f.month_date);
      if (monthDate.getFullYear() !== year) return;
      const monthIdx = monthDate.getMonth();
      months[monthIdx].forecastPremium += f.amount || 0;

      // Find the product to get commission percent
      const product = clientProducts.find((p) => p.id === f.client_product_id);
      if (product && product.commission_percent > 0) {
        months[monthIdx].forecastCommission += (f.amount || 0) * (product.commission_percent / 100);
      }
    });

    return months;
  }, [allForecasts, clientProducts, year]);

  // Monthly actual data
  const monthlyActuals = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({
      actualPremium: 0,
      actualCommission: 0,
    }));

    actualCommissions.forEach((ac) => {
      const d = new Date(ac.month_date);
      if (d.getFullYear() !== year) return;
      const monthIdx = d.getMonth();
      months[monthIdx].actualPremium += ac.actual_premium;
      months[monthIdx].actualCommission += ac.actual_commission;
    });

    return months;
  }, [actualCommissions, year]);

  // KPI totals
  const totals = useMemo(() => {
    const forecastCommission = monthlyForecasts.reduce((s, m) => s + m.forecastCommission, 0);
    const forecastPremium = monthlyForecasts.reduce((s, m) => s + m.forecastPremium, 0);
    const actualCommission = monthlyActuals.reduce((s, m) => s + m.actualCommission, 0);
    const actualPremium = monthlyActuals.reduce((s, m) => s + m.actualPremium, 0);
    const variance = actualCommission - forecastCommission;
    const realization = forecastCommission > 0 ? (actualCommission / forecastCommission) * 100 : 0;

    return { forecastCommission, forecastPremium, actualCommission, actualPremium, variance, realization };
  }, [monthlyForecasts, monthlyActuals]);

  // Per-client breakdown
  const clientBreakdown = useMemo(() => {
    return clients.map((client) => {
      const products = clientProducts.filter((p) => p.team_contact_id === client.id);
      const productDetails = products.map((product) => {
        // Get forecasts for this product
        const productForecasts = allForecasts.filter((f: any) => f.client_product_id === product.id);
        const forecastTotal = productForecasts.reduce((s: number, f: any) => {
          const d = new Date(f.month_date);
          if (d.getFullYear() !== year) return s;
          return s + (f.amount || 0);
        }, 0);
        const forecastCommission = forecastTotal * (product.commission_percent / 100);

        // Get actuals for this product
        const productActuals = actualCommissions.filter((ac) => ac.client_product_id === product.id);
        const actualTotal = productActuals.reduce((s, ac) => s + ac.actual_premium, 0);
        const actualCommissionTotal = productActuals.reduce((s, ac) => s + ac.actual_commission, 0);

        const realization = forecastCommission > 0 ? (actualCommissionTotal / forecastCommission) * 100 : 0;

        return {
          product,
          forecastPremium: forecastTotal,
          forecastCommission,
          actualPremium: actualTotal,
          actualCommission: actualCommissionTotal,
          realization,
        };
      });

      const totalForecast = productDetails.reduce((s, p) => s + p.forecastCommission, 0);
      const totalActual = productDetails.reduce((s, p) => s + p.actualCommission, 0);
      const realization = totalForecast > 0 ? (totalActual / totalForecast) * 100 : 0;

      return { client, productDetails, totalForecast, totalActual, realization };
    }).filter((c) => c.productDetails.length > 0);
  }, [clients, clientProducts, allForecasts, actualCommissions, year]);

  const handleSaveMonthlyValue = async (monthIdx: number, field: 'premium' | 'commission') => {
    const value = parseFloat(editValue) || 0;

    // We need a team_contact_id; for monthly aggregates, we upsert per client
    // For simplicity, we aggregate at team level with the first client
    // In a real scenario, we'd break this down per client.
    // For now, find or create a record for the first client
    if (clients.length === 0) return;

    const monthDate = format(addMonths(startOfYear(new Date(year, 0, 1)), monthIdx), 'yyyy-MM-dd');

    // Check if there's an existing record for this month (aggregate)
    const existing = actualCommissions.find((ac) => {
      const d = new Date(ac.month_date);
      return d.getMonth() === monthIdx && !ac.client_product_id;
    });

    await upsertMutation.mutateAsync({
      id: existing?.id,
      teamId,
      teamContactId: existing?.team_contact_id || clients[0].id,
      clientProductId: null,
      monthDate,
      actualPremium: field === 'premium' ? value : (existing?.actual_premium || monthlyActuals[monthIdx].actualPremium),
      actualCommission: field === 'commission' ? value : (existing?.actual_commission || monthlyActuals[monthIdx].actualCommission),
    });

    setEditingCell(null);
  };

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setYear(year - 1)}>←</Button>
        <span className="font-semibold text-lg">{year}</span>
        <Button variant="outline" size="sm" onClick={() => setYear(year + 1)}>→</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Prognoza prowizji</span>
            </div>
            <p className="text-2xl font-bold">{formatCompactCurrency(totals.forecastCommission)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Składki: {formatCompactCurrency(totals.forecastPremium)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Otrzymana prowizja</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCompactCurrency(totals.actualCommission)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Składki: {formatCompactCurrency(totals.actualPremium)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {totals.variance >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm text-muted-foreground">Różnica</span>
            </div>
            <p className={cn('text-2xl font-bold', totals.variance >= 0 ? 'text-emerald-600' : 'text-destructive')}>
              {totals.variance >= 0 ? '+' : ''}{formatCompactCurrency(totals.variance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">% realizacji</span>
            </div>
            <p className={cn('text-2xl font-bold', getVarianceColor(totals.realization))}>
              {totals.realization.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zestawienie miesięczne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-muted-foreground">Miesiąc</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Prognoza składki</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Realna składka</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Prognoza prowizji</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Realna prowizja</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Różnica</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">%</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => {
                  const forecast = monthlyForecasts[i];
                  const actual = monthlyActuals[i];
                  const diff = actual.actualCommission - forecast.forecastCommission;
                  const pct = forecast.forecastCommission > 0
                    ? (actual.actualCommission / forecast.forecastCommission) * 100
                    : actual.actualCommission > 0 ? 100 : 0;

                  return (
                    <tr key={i} className={cn('border-b', pct > 0 && getVarianceBg(pct))}>
                      <td className="p-2 font-medium capitalize">{MONTHS_LABELS[i]}</td>
                      <td className="text-right p-2">{formatCompactCurrency(forecast.forecastPremium)}</td>
                      <td className="text-right p-2">
                        {editingCell?.month === i && editingCell.field === 'premium' ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              className="w-24 h-7 text-right text-sm"
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveMonthlyValue(i, 'premium')}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingCell(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="hover:underline cursor-pointer"
                            onClick={() => {
                              setEditingCell({ month: i, field: 'premium' });
                              setEditValue(String(actual.actualPremium || ''));
                            }}
                          >
                            {actual.actualPremium > 0 ? formatCompactCurrency(actual.actualPremium) : '—'}
                          </button>
                        )}
                      </td>
                      <td className="text-right p-2">{formatCompactCurrency(forecast.forecastCommission)}</td>
                      <td className="text-right p-2">
                        {editingCell?.month === i && editingCell.field === 'commission' ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              className="w-24 h-7 text-right text-sm"
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveMonthlyValue(i, 'commission')}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingCell(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="hover:underline cursor-pointer"
                            onClick={() => {
                              setEditingCell({ month: i, field: 'commission' });
                              setEditValue(String(actual.actualCommission || ''));
                            }}
                          >
                            {actual.actualCommission > 0 ? formatCompactCurrency(actual.actualCommission) : '—'}
                          </button>
                        )}
                      </td>
                      <td className={cn('text-right p-2 font-medium', diff >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                        {forecast.forecastCommission > 0 || actual.actualCommission > 0
                          ? `${diff >= 0 ? '+' : ''}${formatCompactCurrency(diff)}`
                          : '—'}
                      </td>
                      <td className={cn('text-right p-2 font-medium', getVarianceColor(pct))}>
                        {forecast.forecastCommission > 0 ? `${pct.toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="font-bold border-t-2">
                  <td className="p-2">Razem</td>
                  <td className="text-right p-2">{formatCompactCurrency(totals.forecastPremium)}</td>
                  <td className="text-right p-2">{formatCompactCurrency(totals.actualPremium)}</td>
                  <td className="text-right p-2">{formatCompactCurrency(totals.forecastCommission)}</td>
                  <td className="text-right p-2 text-emerald-600">{formatCompactCurrency(totals.actualCommission)}</td>
                  <td className={cn('text-right p-2', totals.variance >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                    {totals.variance >= 0 ? '+' : ''}{formatCompactCurrency(totals.variance)}
                  </td>
                  <td className={cn('text-right p-2', getVarianceColor(totals.realization))}>
                    {totals.realization.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Client Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Szczegóły per klient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {clientBreakdown.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak klientów z produktami</p>
          )}
          {clientBreakdown.map(({ client, productDetails, totalForecast, totalActual, realization }) => (
            <Collapsible key={client.id}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  <div className="text-left">
                    <p className="font-medium">{client.contact?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{client.contact?.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Prognoza: {formatCompactCurrency(totalForecast)}
                  </span>
                  <span className={cn('font-medium', getVarianceColor(realization))}>
                    Realne: {formatCompactCurrency(totalActual)} ({realization.toFixed(0)}%)
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-7 mt-1 space-y-1">
                  {productDetails.map(({ product, forecastPremium, forecastCommission, actualPremium, actualCommission: ac, realization: r }) => (
                    <div key={product.id} className={cn('flex items-center justify-between p-2 rounded text-sm', getVarianceBg(r))}>
                      <div className="flex items-center gap-2">
                        {product.category_color && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: product.category_color }} />
                        )}
                        <span>{product.category_name || 'Produkt'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          Składka: {formatCompactCurrency(forecastPremium)} → {formatCompactCurrency(actualPremium)}
                        </span>
                        <span className={cn('font-medium', getVarianceColor(r))}>
                          Prowizja: {formatCompactCurrency(forecastCommission)} → {formatCompactCurrency(ac)}
                          {forecastCommission > 0 && ` (${r.toFixed(0)}%)`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
