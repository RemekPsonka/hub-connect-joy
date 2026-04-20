import { Link } from 'react-router-dom';
import { Calendar, FileCheck, Wallet, Coins, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/sgu/KPICard';
import { TeamPerformanceTable } from '@/components/sgu/TeamPerformanceTable';
import { AlertsPanel } from '@/components/sgu/AlertsPanel';
import { useSGUWeeklyKPI } from '@/hooks/useSGUWeeklyKPI';
import { useSGUTeamPerformance } from '@/hooks/useSGUTeamPerformance';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { DashboardHeader } from '@/components/sgu/headers/DashboardHeader';

const formatPLN = (gr: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(gr / 100);

const computeDelta = (curr?: number, prev?: number): number | null => {
  if (typeof curr !== 'number' || typeof prev !== 'number' || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
};

const weekRangeLabel = () => {
  const now = new Date();
  const day = now.getDay() || 7; // Mon=1..Sun=7
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  return `${fmt(monday)}–${fmt(sunday)}`;
};

export default function SGUDashboard() {
  const { isPartner } = useSGUAccess();
  const { data: kpi, isLoading: kpiLoading } = useSGUWeeklyKPI(0);
  const { data: perf, isLoading: perfLoading } = useSGUTeamPerformance(0);

  const meetings = Number(kpi?.meetings_count ?? 0);
  const policies = Number(kpi?.policies_issued_count ?? 0);
  const collected = Number(kpi?.premium_collected_gr ?? 0);
  const commission = Number(kpi?.commission_earned_gr ?? 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard SGU</h1>
          <p className="text-sm text-muted-foreground">Tydzień {weekRangeLabel()}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/sgu/tasks">
            Zobacz wszystkie zadania
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      <DashboardHeader />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Spotkania"
          value={meetings}
          delta={computeDelta(meetings, Number(kpi?.prev_meetings_count ?? 0))}
          icon={Calendar}
          variant="default"
          loading={kpiLoading}
        />
        <KPICard
          label="Polisy wystawione"
          value={policies}
          delta={computeDelta(policies, Number(kpi?.prev_policies_issued_count ?? 0))}
          icon={FileCheck}
          variant="success"
          loading={kpiLoading}
        />
        <KPICard
          label="Składki opłacone"
          value={formatPLN(collected)}
          delta={computeDelta(collected, Number(kpi?.prev_premium_collected_gr ?? 0))}
          icon={Wallet}
          variant="default"
          loading={kpiLoading}
        />
        <KPICard
          label="Prowizje"
          value={formatPLN(commission)}
          delta={computeDelta(commission, Number(kpi?.prev_commission_earned_gr ?? 0))}
          icon={Coins}
          variant="success"
          loading={kpiLoading}
        />
      </div>

      {isPartner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wyniki zespołu (tydzień bieżący)</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamPerformanceTable data={perf ?? []} isLoading={perfLoading} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerty</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertsPanel />
        </CardContent>
      </Card>
    </div>
  );
}
