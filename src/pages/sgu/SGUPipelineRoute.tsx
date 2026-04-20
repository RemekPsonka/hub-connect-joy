import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { PageLoadingFallback } from '@/components/PageLoadingFallback';
import { SalesHeader } from '@/components/sgu/headers/SalesHeader';
import { UnifiedKanban } from '@/components/sgu/sales/UnifiedKanban';

type SalesFilter = 'prospect' | 'lead' | 'offering' | 'today' | 'overdue';

export default function SGUPipelineRoute() {
  const { sguTeamId, isLoading } = useSGUTeamId();
  const [filter, setFilter] = useState<SalesFilter | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (filter === 'today' || filter === 'overdue') {
      navigate(`/sgu/zadania?filter=${filter}`, { replace: true });
    }
  }, [filter, navigate]);

  if (isLoading) return <PageLoadingFallback />;
  if (!sguTeamId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Brak skonfigurowanego zespołu SGU. Skontaktuj się z administratorem.
      </div>
    );
  }

  const kanbanFilter =
    filter === 'today' || filter === 'overdue' ? null : filter;

  return (
    <div className="space-y-4">
      <SalesHeader
        teamId={sguTeamId}
        activeKey={filter}
        onCardClick={(k) => setFilter((prev) => (prev === k ? null : k))}
      />
      <UnifiedKanban teamId={sguTeamId} filter={kanbanFilter} />
    </div>
  );
}
