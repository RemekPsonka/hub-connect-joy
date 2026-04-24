import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, CheckCircle2, Clock } from 'lucide-react';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useOdprawaAgenda } from '@/hooks/useOdprawaAgenda';
import {
  useActiveOdprawaSession,
  useStartOdprawa,
  useFinishOdprawa,
} from '@/hooks/useOdprawaSession';
import { AgendaList } from '@/components/sgu/odprawa/AgendaList';
import { toast } from 'sonner';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export default function SGUOdprawa() {
  const { sguTeamId, isLoading: loadingTeam } = useSGUTeamId();
  const teamId = sguTeamId ?? null;

  const agendaQ = useOdprawaAgenda(teamId);
  const activeQ = useActiveOdprawaSession(teamId);
  const startMut = useStartOdprawa();
  const finishMut = useFinishOdprawa();

  const [busy, setBusy] = useState(false);

  if (loadingTeam) return null;

  if (!teamId) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <Alert>
          <AlertDescription>Brak skonfigurowanego zespołu SGU.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const agenda = agendaQ.data ?? [];
  const active = activeQ.data;

  const handleStart = async () => {
    if (!teamId) return;
    setBusy(true);
    try {
      await startMut.mutateAsync({ teamId, agenda, mode: 'standard' });
      toast.success('Odprawa uruchomiona');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się uruchomić odprawy';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = async () => {
    if (!active || !teamId) return;
    setBusy(true);
    try {
      await finishMut.mutateAsync({ sessionId: active.id, teamId });
      toast.success('Odprawa zakończona');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się zakończyć odprawy';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Odprawa</h1>
          <p className="text-sm text-muted-foreground">
            Codzienny przegląd agendy zespołu sprzedaży.
          </p>
        </div>
        {active ? (
          <Button onClick={handleFinish} disabled={busy} variant="default">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Zakończ odprawę
          </Button>
        ) : (
          <Button onClick={handleStart} disabled={busy || agenda.length === 0}>
            <Play className="h-4 w-4 mr-2" />
            Startuj odprawę
          </Button>
        )}
      </div>

      {active && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium">Sesja aktywna</span>
            <span className="text-muted-foreground">
              od {formatTime(active.started_at)} · {active.agenda_snapshot.length} kontaktów w migawce
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Agenda na dziś{' '}
            <span className="text-sm font-normal text-muted-foreground">
              ({agenda.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AgendaList rows={agenda} isLoading={agendaQ.isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
