import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useOdprawaAgenda } from '@/hooks/sgu/useOdprawaAgenda';
import { useActiveOdprawaSession } from '@/hooks/sgu/useActiveOdprawaSession';
import { useStartOdprawa } from '@/hooks/sgu/useStartOdprawa';
import { useAbandonOdprawa, useCloseOdprawa } from '@/hooks/sgu/useAbandonOdprawa';
import { OdprawaSessionHeader } from '@/components/sgu/odprawa/OdprawaSessionHeader';
import { OdprawaAgendaList } from '@/components/sgu/odprawa/OdprawaAgendaList';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardCheck } from 'lucide-react';

export default function SGUOdprawa() {
  const { sguTeamId, tenantId, isLoading: teamLoading } = useSGUTeamId();
  const { data: agenda, isLoading: agendaLoading } = useOdprawaAgenda(sguTeamId);
  const { data: activeSession, isLoading: sessionLoading } = useActiveOdprawaSession(sguTeamId);
  const startMut = useStartOdprawa();
  const abandonMut = useAbandonOdprawa();
  const closeMut = useCloseOdprawa();

  const [coveredIds, setCoveredIds] = useState<string[]>([]);

  const handleMarkCovered = useCallback((id: string) => {
    setCoveredIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleStart = useCallback(() => {
    if (!sguTeamId || !tenantId) return;
    setCoveredIds([]);
    startMut.mutate({ teamId: sguTeamId, tenantId });
  }, [sguTeamId, tenantId, startMut]);

  const handleAbandon = useCallback(() => {
    if (!activeSession || !sguTeamId) return;
    if (!window.confirm('Porzucić odprawę? Postęp nie zostanie zapisany jako "zakończony".')) return;
    abandonMut.mutate({ sessionId: activeSession.id, teamId: sguTeamId });
    setCoveredIds([]);
  }, [activeSession, sguTeamId, abandonMut]);

  const handleClose = useCallback(() => {
    if (!activeSession || !sguTeamId) return;
    closeMut.mutate(
      {
        sessionId: activeSession.id,
        teamId: sguTeamId,
        coveredContactIds: coveredIds,
      },
      {
        onSuccess: () => setCoveredIds([]),
      },
    );
  }, [activeSession, sguTeamId, coveredIds, closeMut]);

  if (teamLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!sguTeamId || !tenantId) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={ClipboardCheck}
          title="Brak skonfigurowanego zespołu SGU"
          description="Skontaktuj się z administratorem, aby ustawić zespół SGU w ustawieniach."
        />
      </div>
    );
  }

  const totalAgenda = agenda?.length ?? 0;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Odprawa zespołu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cykliczny przegląd kontaktów w lejku — priorytety, pytania, zalegające.
          </p>
        </div>
        <Button variant="outline" asChild className="gap-2">
          <Link to="/sgu/odprawa/historia">
            <History className="h-4 w-4" />
            Historia
          </Link>
        </Button>
      </div>

      <OdprawaSessionHeader
        session={activeSession ?? null}
        totalAgenda={totalAgenda}
        coveredCount={coveredIds.length}
        isStarting={startMut.isPending}
        isClosing={closeMut.isPending}
        isAbandoning={abandonMut.isPending}
        onStart={handleStart}
        onClose={handleClose}
        onAbandon={handleAbandon}
      />

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Agenda ({totalAgenda})
        </h2>
        <OdprawaAgendaList
          items={agenda}
          isLoading={agendaLoading || sessionLoading}
          coveredIds={coveredIds}
          onMarkCovered={handleMarkCovered}
        />
      </div>
    </div>
  );
}