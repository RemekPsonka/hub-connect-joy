import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { DashboardHeader } from '@/components/sgu/headers/DashboardHeader';
import { PriorityTodayCard } from '@/components/sgu/dashboard/PriorityTodayCard';
import { AlertsCard } from '@/components/sgu/dashboard/AlertsCard';
import { TeamPerformanceCard } from '@/components/sgu/dashboard/TeamPerformanceCard';
import { StickyQuickActions } from '@/components/sgu/dashboard/StickyQuickActions';
import { EmptyStateCTA } from '@/components/sgu/dashboard/EmptyStateCTA';
import { useDashboardEmptyState } from '@/hooks/sgu-dashboard/useDashboardEmptyState';
import { useFunnelStats } from '@/hooks/sgu-dashboard/useFunnelStats';
import { FunnelConversionChart } from '@/components/deals-team/FunnelConversionChart';

const weekRangeLabel = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  return `${fmt(monday)}–${fmt(sunday)}`;
};

export default function SGUDashboard() {
  const { isPartner } = useSGUAccess();
  const { data: emptyState, isLoading: emptyLoading } = useDashboardEmptyState();
  const { data: funnelStats } = useFunnelStats();

  const showEmpty = !emptyLoading && emptyState?.isEmpty === true;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard SGU</h1>
          <p className="text-sm text-muted-foreground">
            Tydzień {weekRangeLabel()}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/sgu/zadania">
            Zobacz wszystkie zadania
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      <DashboardHeader />

      {showEmpty ? (
        <EmptyStateCTA />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PriorityTodayCard />
            <AlertsCard />
          </div>

          {isPartner && <TeamPerformanceCard />}

          {funnelStats && <FunnelConversionChart stats={funnelStats} />}
        </>
      )}

      <StickyQuickActions />
    </div>
  );
}
