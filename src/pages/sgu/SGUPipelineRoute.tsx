import { useState } from 'react';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { PageLoadingFallback } from '@/components/PageLoadingFallback';
import DealsTeamDashboard from '@/pages/DealsTeamDashboard';
import { SalesHeader } from '@/components/sgu/headers/SalesHeader';

type SalesFilter = 'prospect' | 'lead' | 'offering' | 'today' | 'overdue';

export default function SGUPipelineRoute() {
  const { sguTeamId, isLoading } = useSGUTeamId();
  const [filter, setFilter] = useState<SalesFilter | null>(null);

  if (isLoading) return <PageLoadingFallback />;
  if (!sguTeamId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Brak skonfigurowanego zespołu SGU. Skontaktuj się z administratorem.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SalesHeader
        teamId={sguTeamId}
        activeKey={filter}
        onCardClick={(k) => setFilter((prev) => (prev === k ? null : k))}
      />
      <DealsTeamDashboard forcedTeamId={sguTeamId} forcedFilter={filter} />
    </div>
  );
}
