import { useMemo, useState } from 'react';
import {
  Flame, Star, ClipboardList, Snowflake, UserCheck, Briefcase, Search,
  RefreshCw, XCircle, AlertTriangle, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, Target, Calendar,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Cell, LabelList,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamContactStats, useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { useTeamProspects } from '@/hooks/useDealsTeamProspects';
import {
  useTeamClients, useAllTeamClientProducts, useAllTeamForecasts,
  CATEGORY_PROBABILITY,
} from '@/hooks/useTeamClients';
import { useTeamPaymentSchedule } from '@/hooks/usePaymentSchedule';
import { useActualCommissions } from '@/hooks/useCommissions';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import {
  format, addMonths, startOfMonth, startOfYear, endOfYear,
  startOfQuarter, endOfQuarter, endOfMonth, parseISO, isWithinInterval,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { FunnelConversionChart } from './FunnelConversionChart';

interface SalesFunnelDashboardProps {
  teamId: string;
}

type PeriodType = 'month' | 'quarter' | 'year';

function getPeriodRange(type: PeriodType, offset: number) {
  const now = new Date();
  let base: Date;
  if (type === 'year') {
    base = new Date(now.getFullYear() + offset, 0, 1);
    return { start: startOfYear(base), end: endOfYear(base), label: format(base, 'yyyy') };
  }
  if (type === 'quarter') {
    base = addMonths(startOfQuarter(now), offset * 3);
    return {
      start: startOfQuarter(base),
      end: endOfQuarter(base),
      label: `Q${Math.floor(base.getMonth() / 3) + 1} ${format(base, 'yyyy')}`,
    };
  }
  base = addMonths(startOfMonth(now), offset);
  return {
    start: startOfMonth(base),
    end: endOfMonth(base),
    label: format(base, 'LLLL yyyy', { locale: pl }),
  };
}

export function SalesFunnelDashboard({ teamId }: SalesFunnelDashboardProps) {
  const [periodType, setPeriodType] = useState<PeriodType>('year');
  const [periodOffset, setPeriodOffset] = useState(0);

  const period = useMemo(() => getPeriodRange(periodType, periodOffset), [periodType, periodOffset]);
  const prevPeriod = useMemo(() => getPeriodRange(periodType, periodOffset - 1), [periodType, periodOffset]);

  // Data hooks
  const contactStats = useTeamContactStats(teamId);
  const { data: allContacts = [] } = useTeamContacts(teamId);
  const { data: prospects = [] } = useTeamProspects(teamId, true);
  const { data: clients = [] } = useTeamClients(teamId);
  const { data: allProducts = [] } = useAllTeamClientProducts(teamId);
  const { data: allForecasts = [] } = useAllTeamForecasts(teamId);
  const { data: payments = [] } = useTeamPaymentSchedule(teamId);
  const currentYear = new Date().getFullYear();
  const { data: actualCommissions = [] } = useActualCommissions(teamId, currentYear);

  const offeringCount = useMemo(
    () => allContacts.filter(c => c.category === 'offering').length,
    [allContacts]
  );

  // Category values
  const categoryValues = useMemo(() => {
    const values: Record<string, { value: number; commission: number }> = {
      hot: { value: 0, commission: 0 }, top: { value: 0, commission: 0 },
      lead: { value: 0, commission: 0 }, '10x': { value: 0, commission: 0 },
      cold: { value: 0, commission: 0 }, lost: { value: 0, commission: 0 },
      offering: { value: 0, commission: 0 },
    };
    allProducts.forEach(p => {
      const contact = allContacts.find(c => c.id === p.team_contact_id);
      if (contact && contact.category in values) {
        values[contact.category].value += p.deal_value;
        values[contact.category].commission += p.expected_commission;
      }
    });
    return values;
  }, [allProducts, allContacts]);

  const { clientTotalValue, clientTotalCommission } = useMemo(() => {
    let value = 0, commission = 0;
    allProducts.forEach(p => {
      if (clients.find(c => c.id === p.team_contact_id)) {
        value += p.deal_value;
        commission += p.expected_commission;
      }
    });
    return { clientTotalValue: value, clientTotalCommission: commission };
  }, [allProducts, clients]);

  // Weighted pipeline
  const weightedValue = useMemo(() => {
    let total = 0;
    allProducts.forEach(p => {
      const contact = allContacts.find(c => c.id === p.team_contact_id);
      const prob = contact ? (CATEGORY_PROBABILITY[contact.category] || 0) : p.probability_percent;
      total += p.deal_value * (prob / 100);
    });
    return total;
  }, [allProducts, allContacts]);

  // Prospect stats
  const prospectStats = useMemo(() => {
    const active = prospects.filter(p => p.status !== 'converted' && p.status !== 'cancelled');
    return { total: active.length, converted: prospects.filter(p => p.status === 'converted').length };
  }, [prospects]);

  // 3 forecast sources
  const forecastFromFunnel = useMemo(() => {
    let total = 0;
    allProducts.forEach(p => {
      const contact = allContacts.find(c => c.id === p.team_contact_id);
      if (contact && contact.category !== 'client') {
        const prob = CATEGORY_PROBABILITY[contact.category] || 0;
        total += p.deal_value * (prob / 100);
      }
    });
    return total;
  }, [allProducts, allContacts]);

  const forecastFromOffering = useMemo(
    () => payments.filter(p => !p.is_paid).reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  const forecastFromCommissions = useMemo(
    () => allForecasts.reduce((s: number, f: any) => s + (f.amount || 0), 0),
    [allForecasts]
  );

  // Commission KPIs
  const commissionKPIs = useMemo(() => {
    const forecastTotal = allForecasts.reduce((s: number, f: any) => s + (f.amount || 0), 0);
    const actualTotal = actualCommissions.reduce((s, c) => s + c.actual_commission, 0);
    const diff = actualTotal - forecastTotal;
    const pct = forecastTotal > 0 ? (actualTotal / forecastTotal) * 100 : 0;
    return { forecast: forecastTotal, actual: actualTotal, diff, pct };
  }, [allForecasts, actualCommissions]);

  // Offering KPIs
  const offeringKPIs = useMemo(() => {
    const total = payments.reduce((s, p) => s + p.amount, 0);
    const paid = payments.filter(p => p.is_paid).reduce((s, p) => s + p.amount, 0);
    const upcoming = payments.filter(p => !p.is_paid).length;
    return { inOffering: offeringCount, totalScheduled: total, totalPaid: paid, upcoming };
  }, [payments, offeringCount]);

  // Timeline 24 months
  const timelineData = useMemo(() => {
    const now = startOfMonth(new Date());
    return Array.from({ length: 24 }, (_, i) => {
      const d = addMonths(now, i);
      const monthStr = format(d, 'yyyy-MM');
      const monthLabel = format(d, 'LLL yy', { locale: pl });

      // Funnel: simplified - distribute weighted evenly over 12 months
      const funnelMonthly = forecastFromFunnel / 12;

      // Offering: scheduled payments in that month
      const offeringMonthly = payments
        .filter(p => !p.is_paid && format(parseISO(p.scheduled_date), 'yyyy-MM') === monthStr)
        .reduce((s, p) => s + p.amount, 0);

      // Client commissions from forecasts
      const commissionMonthly = allForecasts
        .filter((f: any) => f.month_date && format(parseISO(f.month_date), 'yyyy-MM') === monthStr)
        .reduce((s: number, f: any) => s + (f.amount || 0), 0);

      return { month: monthLabel, funnel: Math.round(funnelMonthly), offering: offeringMonthly, commissions: commissionMonthly };
    });
  }, [forecastFromFunnel, payments, allForecasts]);

  const timelineConfig: ChartConfig = {
    funnel: { label: 'Prognoza z lejka', color: '#6366f1' },
    offering: { label: 'Prognoza z ofertowania', color: '#10b981' },
    commissions: { label: 'Prowizje klientów', color: '#f59e0b' },
  };

  // Full funnel stages for dashboard
  const fullFunnelData = useMemo(() => [
    { name: 'KLIENT', value: clients.length, color: '#8b5cf6' },
    { name: 'OFERTOWANIE', value: offeringCount, color: '#10b981' },
    { name: 'HOT', value: contactStats.hot_count, color: '#ef4444' },
    { name: 'TOP', value: contactStats.top_count, color: '#f59e0b' },
    { name: 'LEAD', value: contactStats.lead_count, color: '#3b82f6' },
    { name: '10x', value: contactStats.tenx_count, color: '#06b6d4' },
    { name: 'COLD', value: contactStats.cold_count, color: '#94a3b8' },
  ], [clients.length, offeringCount, contactStats]);

  const fullFunnelConfig: ChartConfig = Object.fromEntries(
    fullFunnelData.map(s => [s.name, { label: s.name, color: s.color }])
  );

  const hasFullFunnelData = fullFunnelData.some(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={periodType} onValueChange={v => { setPeriodType(v as PeriodType); setPeriodOffset(0); }}>
          <TabsList>
            <TabsTrigger value="month">Miesiąc</TabsTrigger>
            <TabsTrigger value="quarter">Kwartał</TabsTrigger>
            <TabsTrigger value="year">Rok</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setPeriodOffset(o => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center capitalize">{period.label}</span>
          <Button variant="ghost" size="icon" onClick={() => setPeriodOffset(o => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Section 1: KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-9 gap-3">
        <KPICard icon={Flame} label="HOT Leads" count={contactStats.hot_count} value={categoryValues.hot.value} commission={categoryValues.hot.commission} color="text-red-500" borderColor="border-l-red-500" overdue={contactStats.overdue_count} />
        <KPICard icon={Star} label="TOP Leads" count={contactStats.top_count} value={categoryValues.top.value} commission={categoryValues.top.commission} color="text-amber-500" borderColor="border-l-amber-500" />
        <KPICard icon={ClipboardList} label="Leads" count={contactStats.lead_count} value={categoryValues.lead.value} commission={categoryValues.lead.commission} color="text-blue-500" borderColor="border-l-blue-500" />
        <KPICard icon={RefreshCw} label="10x" count={contactStats.tenx_count} value={categoryValues['10x'].value} color="text-cyan-500" borderColor="border-l-cyan-500" />
        <KPICard icon={Snowflake} label="Cold" count={contactStats.cold_count} value={categoryValues.cold.value} color="text-slate-500" borderColor="border-l-slate-400" />
        <KPICard icon={XCircle} label="Przegrane" count={contactStats.lost_count} color="text-gray-500" borderColor="border-l-gray-400" />
        <KPICard icon={UserCheck} label="Klienci" count={clients.length} value={clientTotalValue} commission={clientTotalCommission} color="text-emerald-500" borderColor="border-l-emerald-500" />
        <KPICard icon={Briefcase} label="Ofertowanie" count={offeringCount} value={categoryValues.offering.value} commission={categoryValues.offering.commission} color="text-teal-500" borderColor="border-l-teal-500" />
        <KPICard icon={Search} label="Poszukiwani" count={prospectStats.total} color="text-purple-500" borderColor="border-l-purple-500" subtitle={`${prospectStats.converted} skonw.`} />
      </div>

      {/* Weighted pipeline */}
      {weightedValue > 0 && (
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Pipeline ważony (produkty × % szans)</p>
            <p className="text-xl font-bold">{formatCompactCurrency(weightedValue)}</p>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Funnel + 3 forecast sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full funnel */}
        {hasFullFunnelData && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lejek konwersji</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={fullFunnelConfig} className="h-[260px] w-full aspect-auto">
                <BarChart data={fullFunnelData} layout="vertical" margin={{ left: 0, right: 40, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {fullFunnelData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                    <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-medium" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* 3 forecast sources */}
        <div className="space-y-4">
          <ForecastCard
            title="Prognoza z lejka"
            description="Pipeline ważony (produkty × % szans wg kategorii)"
            value={forecastFromFunnel}
            icon={Target}
            color="text-indigo-500"
          />
          <ForecastCard
            title="Prognoza z ofertowania"
            description="Zaplanowane płatności z harmonogramu"
            value={forecastFromOffering}
            icon={Briefcase}
            color="text-emerald-500"
          />
          <ForecastCard
            title="Prognoza z prowizji klientów"
            description="Revenue forecasts istniejących klientów"
            value={forecastFromCommissions}
            icon={DollarSign}
            color="text-amber-500"
          />
        </div>
      </div>

      {/* Section 3: Commission KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Prowizje</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Prognoza prowizji" value={commissionKPIs.forecast} />
          <MetricCard label="Otrzymana prowizja" value={commissionKPIs.actual} />
          <MetricCard
            label="Różnica"
            value={commissionKPIs.diff}
            trend={commissionKPIs.diff >= 0 ? 'up' : 'down'}
          />
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">% realizacji</p>
              <p className={`text-2xl font-bold ${commissionKPIs.pct >= 80 ? 'text-emerald-600' : commissionKPIs.pct >= 50 ? 'text-amber-600' : 'text-destructive'}`}>
                {commissionKPIs.pct.toFixed(0)}%
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 4: Offering KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Ofertowanie</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">W ofertowaniu</p>
              <p className="text-2xl font-bold">{offeringKPIs.inOffering}</p>
            </CardContent>
          </Card>
          <MetricCard label="Zaplanowane" value={offeringKPIs.totalScheduled} />
          <MetricCard label="Opłacone" value={offeringKPIs.totalPaid} />
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Nadchodzące płatności</p>
              <p className="text-2xl font-bold">{offeringKPIs.upcoming}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 5: 24-month timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Prognoza przychodów — 24 miesiące</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={timelineConfig} className="h-[280px] w-full aspect-auto">
            <AreaChart data={timelineData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="funnel" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Area type="monotone" dataKey="offering" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Area type="monotone" dataKey="commissions" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// === Helper components ===

function KPICard({
  icon: Icon, label, count, value, commission, color, borderColor, overdue, subtitle,
}: {
  icon: any; label: string; count: number; value?: number; commission?: number;
  color: string; borderColor: string; overdue?: number; subtitle?: string;
}) {
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold">{count}</p>
        {value != null && value > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatCompactCurrency(value)}
          </p>
        )}
        {commission != null && commission > 0 && (
          <p className={`text-xs font-medium ${color} mt-0.5`}>
            Pr: {formatCompactCurrency(commission)}
          </p>
        )}
        {overdue != null && overdue > 0 && (
          <div className="flex items-center gap-1 text-xs text-destructive mt-1">
            <AlertTriangle className="h-3 w-3" />
            <span>{overdue} bez statusu</span>
          </div>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ForecastCard({
  title, description, value, icon: Icon, color,
}: {
  title: string; description: string; value: number; icon: any; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2 rounded-lg bg-muted`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <p className="text-lg font-bold">{formatCompactCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, trend }: { label: string; value: number; trend?: 'up' | 'down' }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold">{formatCompactCurrency(value)}</p>
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-destructive" />}
        </div>
      </CardContent>
    </Card>
  );
}
