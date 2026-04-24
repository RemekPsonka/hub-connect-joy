import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Play, X, Check } from 'lucide-react';
import type { OdprawaSession } from '@/hooks/sgu/useActiveOdprawaSession';

interface Props {
  session: OdprawaSession | null;
  totalAgenda: number;
  coveredCount: number;
  isStarting: boolean;
  isClosing: boolean;
  isAbandoning: boolean;
  onStart: () => void;
  onClose: () => void;
  onAbandon: () => void;
}

function formatDuration(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'mniej niż 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

export function OdprawaSessionHeader({
  session,
  totalAgenda,
  coveredCount,
  isStarting,
  isClosing,
  isAbandoning,
  onStart,
  onClose,
  onAbandon,
}: Props) {
  if (!session) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Brak otwartej odprawy</h2>
              <p className="text-sm text-muted-foreground">
                {totalAgenda} kontaktów czeka na omówienie
              </p>
            </div>
          </div>
          <Button onClick={onStart} disabled={isStarting} size="lg" className="gap-2">
            <Play className="h-4 w-4" />
            {isStarting ? 'Startuję…' : 'Rozpocznij odprawę'}
          </Button>
        </div>
      </Card>
    );
  }

  const progressPct = totalAgenda > 0 ? Math.round((coveredCount / totalAgenda) * 100) : 0;

  return (
    <Card className="p-6 bg-primary/5 border-primary/30">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">Odprawa w toku</h2>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40">
                {formatDuration(session.started_at)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Omówiono <span className="font-semibold text-foreground">{coveredCount}</span> z{' '}
              <span className="font-semibold text-foreground">{totalAgenda}</span> · {progressPct}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onAbandon}
            disabled={isAbandoning || isClosing}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Porzuć
          </Button>
          <Button
            onClick={onClose}
            disabled={isClosing || isAbandoning}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {isClosing ? 'Zamykam…' : 'Zakończ odprawę'}
          </Button>
        </div>
      </div>
      {totalAgenda > 0 && (
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </Card>
  );
}