import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProspectingJobStatus } from '@/hooks/useProspectingJobStatus';

interface Props {
  jobId: string;
  onShowCandidates?: () => void;
}

export function ProspectingJobProgress({ jobId, onShowCandidates }: Props) {
  const { data: job, isLoading } = useProspectingJobStatus(jobId);

  if (isLoading || !job) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ładowanie statusu zadania…
        </CardContent>
      </Card>
    );
  }

  const isActive = job.status === 'pending' || job.status === 'processing';
  const isDone = job.status === 'completed';
  const isFailed = job.status === 'failed' || job.status === 'cancelled';
  const added = (job.result?.candidates_added as number | undefined) ?? 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isActive && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
            {isDone && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
            {isFailed && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
            <span className="font-medium truncate">Zadanie #{jobId.slice(0, 8)}</span>
            <Badge variant={isDone ? 'default' : isFailed ? 'destructive' : 'secondary'}>
              {job.status}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(job.created_at).toLocaleTimeString('pl-PL')}
          </span>
        </div>

        {isActive && (
          <>
            <Progress value={job.progress} />
            <p className="text-xs text-muted-foreground">
              {job.progress}% — kandydatów: {added}
            </p>
          </>
        )}

        {isDone && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm">
              Zakończono. Znaleziono <strong>{added}</strong> kandydatów.
            </p>
            {onShowCandidates && (
              <Button size="sm" variant="outline" onClick={onShowCandidates}>
                Pokaż kandydatów
              </Button>
            )}
          </div>
        )}

        {isFailed && (
          <p className="text-sm text-destructive">{job.error ?? 'Zadanie nie powiodło się'}</p>
        )}
      </CardContent>
    </Card>
  );
}
