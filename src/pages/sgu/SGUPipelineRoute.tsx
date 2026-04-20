import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { PageLoadingFallback } from '@/components/PageLoadingFallback';
import { SalesHeader } from '@/components/sgu/headers/SalesHeader';
import { UnifiedKanban } from '@/components/sgu/sales/UnifiedKanban';
import { AddLeadDialog } from '@/components/sgu/AddLeadDialog';

type SalesFilter = 'prospect' | 'lead' | 'offering' | 'today' | 'overdue';

export default function SGUPipelineRoute() {
  const { sguTeamId, isLoading } = useSGUTeamId();
  const [filter, setFilter] = useState<SalesFilter | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (filter === 'today' || filter === 'overdue') {
      navigate(`/sgu/zadania?filter=${filter}`, { replace: true });
    }
  }, [filter, navigate]);

  useEffect(() => {
    if (searchParams.get('action') === 'new-client') {
      setAddOpen(true);
    }
  }, [searchParams]);

  const handleAddOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (!open && searchParams.get('action')) {
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  };

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
      <AddLeadDialog open={addOpen} onOpenChange={handleAddOpenChange} />
    </div>
  );
}
