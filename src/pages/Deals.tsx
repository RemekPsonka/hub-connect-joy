import { useState, useEffect } from 'react';
import { useDeals, useDealStages, useSeedDealStages } from '@/hooks/useDeals';
import {
  DealsHeader,
  DealsTable,
  DealsKanban,
  CreateDealModal,
  type ViewMode,
} from '@/components/deals';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

export default function Deals() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [stageId, setStageId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: stages = [], isLoading: stagesLoading } = useDealStages();
  const seedStages = useSeedDealStages();

  const { data: dealsData, isLoading: dealsLoading } = useDeals({
    search,
    stageId: stageId === 'all' ? '' : stageId,
    status: status === 'all' ? '' : status,
    page,
    pageSize: 20,
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, stageId, status]);

  const handleSeedStages = async () => {
    await seedStages.mutateAsync();
  };

  // Show seed button if no stages exist
  if (!stagesLoading && stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-semibold mb-2">Brak etapów pipeline</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Aby korzystać z modułu Deals, musisz najpierw utworzyć etapy pipeline.
          Kliknij poniżej, aby utworzyć domyślne etapy.
        </p>
        <Button onClick={handleSeedStages} disabled={seedStages.isPending}>
          {seedStages.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Utwórz domyślne etapy
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DealsHeader
        totalCount={dealsData?.count || 0}
        search={search}
        onSearchChange={setSearch}
        stageId={stageId}
        onStageChange={setStageId}
        status={status}
        onStatusChange={setStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddDeal={() => setIsCreateModalOpen(true)}
        stages={stages}
      />

      {viewMode === 'kanban' ? (
        <DealsKanban
          deals={dealsData?.data || []}
          stages={stages}
          isLoading={dealsLoading || stagesLoading}
        />
      ) : (
        <DealsTable
          deals={dealsData?.data || []}
          totalCount={dealsData?.count || 0}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          isLoading={dealsLoading}
        />
      )}

      <CreateDealModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        stages={stages}
      />
    </div>
  );
}
