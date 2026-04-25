import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, CheckCircle2, Clock } from 'lucide-react';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import {
  useOdprawaAgenda,
  useDealTeamContactByContactId,
  type OdprawaAgendaRow,
} from '@/hooks/useOdprawaAgenda';
import {
  useActiveOdprawaSession,
  useStartOdprawa,
  useFinishOdprawa,
  useAdvanceOdprawaContact,
} from '@/hooks/useOdprawaSession';
import { AgendaList } from '@/components/sgu/odprawa/AgendaList';
import { ContactTasksSheet } from '@/components/deals-team/ContactTasksSheet';
import { DecisionMatrix8 } from '@/components/sgu/odprawa/DecisionMatrix8';
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
  const advanceMut = useAdvanceOdprawaContact();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [selectedAgendaRow, setSelectedAgendaRow] = useState<OdprawaAgendaRow | null>(null);

  const sheetContactQ = useDealTeamContactByContactId(
    selectedAgendaRow?.contact_id ?? null,
    teamId,
  );

  useEffect(() => {
    if (sheetContactQ.error) {
      toast.error('Nie udało się wczytać kontaktu');
      setSelectedAgendaRow(null);
    }
  }, [sheetContactQ.error]);

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

  // F5-resilience: gdy sesja ma current_contact_id, przywróć selekcję z agendy
  useEffect(() => {
    if (!active?.current_contact_id || agenda.length === 0) return;
    if (selectedAgendaRow?.contact_id === active.current_contact_id) return;
    const row = agenda.find((r) => r.contact_id === active.current_contact_id);
    if (row) setSelectedAgendaRow(row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.current_contact_id, agenda.length]);

  const handleDecisionLogged = async () => {
    if (!selectedAgendaRow || !active || !teamId) return;
    const idx = agenda.findIndex((r) => r.contact_id === selectedAgendaRow.contact_id);
    const next = idx >= 0 ? agenda[idx + 1] ?? null : null;
    try {
      await advanceMut.mutateAsync({
        sessionId: active.id,
        nextContactId: next?.contact_id ?? null,
      });
      if (next) {
        setSelectedAgendaRow(next);
      } else {
        await finishMut.mutateAsync({ sessionId: active.id, teamId });
        toast.success('Odprawa zakończona — przekierowanie do historii');
        navigate('/sgu/odprawa/historia');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się przejść do następnego kontaktu';
      toast.error(msg);
    }
  };

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

      {agendaQ.error && (
        <Alert variant="destructive">
          <AlertDescription>
            Nie udało się pobrać agendy: {agendaQ.error instanceof Error ? agendaQ.error.message : String(agendaQ.error)}
          </AlertDescription>
        </Alert>
      )}

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
          <AgendaList
            rows={agenda}
            isLoading={agendaQ.isLoading}
            onSelect={setSelectedAgendaRow}
          />
        </CardContent>
      </Card>

      {teamId && (
        <ContactTasksSheet
          contact={sheetContactQ.data ?? null}
          teamId={teamId}
          open={!!selectedAgendaRow && sheetContactQ.isSuccess && !!sheetContactQ.data}
          onOpenChange={(open) => {
            // W trybie aktywnej odprawy NIE resetujemy selectedAgendaRow przy zamknięciu sheet —
            // DecisionMatrix8 musi pozostać widoczny pod agendą do podjęcia decyzji.
            if (!open && !active) setSelectedAgendaRow(null);
          }}
        />
      )}

      {active && teamId && selectedAgendaRow && sheetContactQ.data && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Decyzja: {sheetContactQ.data.contact?.full_name ?? 'kontakt'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DecisionMatrix8
              contact={{
                id: sheetContactQ.data.id,
                handshake_at: sheetContactQ.data.handshake_at ?? null,
                poa_signed_at: sheetContactQ.data.poa_signed_at ?? null,
              }}
              teamId={teamId}
              tenantId={sheetContactQ.data.tenant_id}
              odprawaSessionId={active.id}
              onDecisionLogged={handleDecisionLogged}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
