import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { PageLoadingFallback } from '@/components/PageLoadingFallback';
import DealsTeamDashboard from '@/pages/DealsTeamDashboard';
import { SalesHeader } from '@/components/sgu/headers/SalesHeader';

export default function SGUPipelineRoute() {
  const { sguTeamId, isLoading } = useSGUTeamId();

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
      <SalesHeader teamId={sguTeamId} />
      <DealsTeamDashboard forcedTeamId={sguTeamId} />
    </div>
  );
}
