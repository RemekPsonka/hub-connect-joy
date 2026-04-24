import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { History, CheckCircle2, XCircle } from 'lucide-react';
import type { OdprawaSession } from '@/hooks/sgu/useActiveOdprawaSession';

interface Props {
  sessions: OdprawaSession[] | undefined;
  isLoading: boolean;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function durationMin(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

export function OdprawaHistoryList({ sessions, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Brak historii odpraw"
        description="Pierwsza zakończona odprawa pojawi się tutaj."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const isClosed = s.status === 'closed';
        const Icon = isClosed ? CheckCircle2 : XCircle;
        return (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Icon
                  className={`h-5 w-5 mt-0.5 shrink-0 ${
                    isClosed ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {formatDateTime(s.started_at)}
                    </span>
                    <Badge variant={isClosed ? 'default' : 'secondary'} className="text-xs">
                      {isClosed ? 'zakończona' : 'porzucona'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Czas: {durationMin(s.started_at, s.ended_at)} · Omówiono{' '}
                    {s.covered_contact_ids?.length ?? 0} kontaktów
                  </p>
                  {s.summary && (
                    <p className="text-sm text-foreground/80 mt-2 line-clamp-2">{s.summary}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}