import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { SGUClientsView } from '@/components/sgu/SGUClientsView';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';

export default function SGUClients() {
  const { sguTeamId, isLoading } = useSGUTeamId();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!sguTeamId) {
    return (
      <div className="p-6">
        <Alert>
          <Users className="h-4 w-4" />
          <AlertTitle>Brak zespołu SGU</AlertTitle>
          <AlertDescription>
            Skonfiguruj <strong>sgu_team_id</strong> w ustawieniach SGU, aby zobaczyć moduł Klienci.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <SGUClientsView teamId={sguTeamId} />
    </div>
  );
}
