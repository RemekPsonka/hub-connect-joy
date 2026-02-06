import { useState, useEffect } from 'react';
import { useDeals, useDealStages, useSeedDealStages } from '@/hooks/useDeals';
import {
  DealsHeader,
  DealsTable,
  DealsKanban,
  DealsAnalytics,
  CreateDealModal,
  type ViewMode,
} from '@/components/deals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, TrendingUp, Target, PiggyBank, Trophy } from 'lucide-react';

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

  // Stats queries
  const { data: openDealsData } = useDeals({ status: 'open', pageSize: 1000 });
  const { data: wonDealsData } = useDeals({ status: 'won', pageSize: 1000 });
  const { data: lostDealsData } = useDeals({ status: 'lost', pageSize: 1000 });

  const openDeals = openDealsData?.data || [];
  const wonDeals = wonDealsData?.data || [];
  const lostDeals = lostDealsData?.data || [];

  const totalValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
  const avgDealSize = openDeals.length ? totalValue / openDeals.length : 0;
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;

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
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Otwarte Deals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{openDeals.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wartość Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalValue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Średni Deal</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {avgDealSize.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{winRate}%</p>
          </CardContent>
        </Card>
      </div>

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

      {viewMode === 'kanban' && (
        <DealsKanban
          deals={dealsData?.data || []}
          stages={stages}
          isLoading={dealsLoading || stagesLoading}
        />
      )}
      
      {viewMode === 'table' && (
        <DealsTable
          deals={dealsData?.data || []}
          totalCount={dealsData?.count || 0}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          isLoading={dealsLoading}
        />
      )}
      
      {viewMode === 'analytics' && <DealsAnalytics />}

      <CreateDealModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        stages={stages}
      />
    </div>
  );
}
