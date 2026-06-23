import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { PageLoadingFallback } from '@/components/PageLoadingFallback';
import { SalesHeader } from '@/components/sgu/headers/SalesHeader';
import { UnifiedKanban } from '@/components/sgu/sales/UnifiedKanban';
import { AddLeadDialog } from '@/components/sgu/AddLeadDialog';
import { AddFromCRMDialog } from '@/components/sgu/AddFromCRMDialog';
import { Button } from '@/components/ui/button';
import { Building2, UserPlus } from 'lucide-react';

type SalesFilter = 'prospect' | 'lead' | 'offering' | 'client' | 'snoozed';

export default function SGUPipelineRoute() {
  const { sguTeamId, isLoading } = useSGUTeamId();
  const [filter, setFilter] = useState<SalesFilter | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addFromCrmOpen, setAddFromCrmOpen] = useState(false);
  const [snoozedOpenTick, setSnoozedOpenTick] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('q') ?? undefined;

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

  const kanbanFilter = filter === 'snoozed' ? null : filter;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddFromCrmOpen(true)}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          Dodaj z CRM
        </Button>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Building2 className="h-4 w-4" />
          Dodaj nową firmę
        </Button>
      </div>
      <SalesHeader
        teamId={sguTeamId}
        activeKey={filter}
        onCardClick={(k) => {
          setFilter((prev) => (prev === k ? null : k));
          if (k === 'snoozed') {
            setSnoozedOpenTick((t) => t + 1);
          }
        }}
      />
      <UnifiedKanban
        teamId={sguTeamId}
        filter={kanbanFilter}
        openSnoozedSignal={snoozedOpenTick}
        initialSearch={initialSearch}
      />
      <AddLeadDialog open={addOpen} onOpenChange={handleAddOpenChange} />
      <AddFromCRMDialog open={addFromCrmOpen} onOpenChange={setAddFromCrmOpen} />
    </div>
  );
}
