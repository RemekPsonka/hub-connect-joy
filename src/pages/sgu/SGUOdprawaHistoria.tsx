import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useOdprawaHistory } from '@/hooks/sgu/useOdprawaHistory';
import { OdprawaHistoryList } from '@/components/sgu/odprawa/OdprawaHistoryList';

export default function SGUOdprawaHistoria() {
  const { sguTeamId } = useSGUTeamId();
  const { data, isLoading } = useOdprawaHistory(sguTeamId);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/sgu/odprawa">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Historia odpraw</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zakończone i porzucone sesje — ostatnie 50.
          </p>
        </div>
      </div>

      <OdprawaHistoryList sessions={data} isLoading={isLoading} />
    </div>
  );
}