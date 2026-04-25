import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, CheckCircle2, Clock, Building2, User } from 'lucide-react';
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
import { useOdprawaSessionDecisions } from '@/hooks/odprawa/useOdprawaSessionDecisions';
import { ContactTimeline } from '@/components/sgu/odprawa/ContactTimeline';
import { DecisionButtons } from '@/components/sgu/odprawa/DecisionButtons';
import { OperationalActions } from '@/components/sgu/odprawa/OperationalActions';
import { ContactTasksInline } from '@/components/sgu/odprawa/ContactTasksInline';
import { useContactTimelineState } from '@/hooks/odprawa/useContactTimelineState';
import type { DecisionKey } from '@/hooks/odprawa/useContactTimelineState';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
  const timelineState = useContactTimelineState(sheetContactQ.data ?? null);
  const sessionDecisions = useOdprawaSessionDecisions(
    activeQ.data?.id ?? null,
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

  // F5-resilience: gdy sesja ma current_contact_id (PK z deal_team_contacts),
  // odwzoruj na contacts.id i wybierz wiersz z agendy.
  useEffect(() => {
    if (!active?.current_contact_id || agenda.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('deal_team_contacts')
        .select('contact_id')
        .eq('id', active.current_contact_id as string)
        .maybeSingle();
      if (cancelled || !data?.contact_id) return;
      if (selectedAgendaRow?.contact_id === data.contact_id) return;
      const row = agenda.find((r) => r.contact_id === data.contact_id);
      if (row) setSelectedAgendaRow(row);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.current_contact_id, agenda.length]);

  const handleDecisionLogged = async (decision: DecisionKey) => {
    if (!selectedAgendaRow || !active || !teamId) return;
    // Auto-advance tylko dla push/pivot. park/kill/klient → karta zostaje.
    if (decision !== 'push' && decision !== 'pivot') return;
    const idx = agenda.findIndex((r) => r.contact_id === selectedAgendaRow.contact_id);
    const next = idx >= 0 ? agenda[idx + 1] ?? null : null;
    try {
      // FK: odprawa_sessions.current_contact_id -> deal_team_contacts.id
      // Agenda RPC zwraca contacts.id, więc trzeba zamienić na PK deal_team_contacts.
      let nextDtcId: string | null = null;
      if (next?.contact_id) {
        const { data: nextDtc } = await supabase
          .from('deal_team_contacts')
          .select('id')
          .eq('contact_id', next.contact_id)
          .eq('team_id', teamId)
          .maybeSingle();
        nextDtcId = nextDtc?.id ?? null;
      }
      await advanceMut.mutateAsync({
        sessionId: active.id,
        nextContactId: nextDtcId,
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

  const dtc = sheetContactQ.data ?? null;
  const contactName = dtc?.contact?.full_name ?? selectedAgendaRow?.contact_name ?? '';
  const companyName = dtc?.contact?.company ?? selectedAgendaRow?.company_name ?? '';
  const ownerName = dtc?.assigned_director?.full_name ?? '—';
  const daysInPipeline = dtc?.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(dtc.created_at).getTime()) / 86_400_000))
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Lewa: agenda */}
        <Card className="self-start">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Agenda{' '}
              <span className="text-sm font-normal text-muted-foreground">({agenda.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-260px)] overflow-y-auto">
            <AgendaList
              rows={agenda}
              isLoading={agendaQ.isLoading}
              onSelect={setSelectedAgendaRow}
              currentContactId={selectedAgendaRow?.contact_id ?? null}
              discussedContactIds={sessionDecisions.discussedContactIds}
            />
          </CardContent>
        </Card>

        {/* Prawa: karta kontaktu */}
        <div>
          {!selectedAgendaRow ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                Wybierz kontakt z agendy, aby otworzyć kartę odprawy.
              </CardContent>
            </Card>
          ) : sheetContactQ.isLoading ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                Wczytywanie kontaktu…
              </CardContent>
            </Card>
          ) : !dtc || !timelineState ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                Nie udało się wczytać karty kontaktu.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3 space-y-1">
                <CardTitle className="text-xl">{contactName || 'Kontakt'}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {companyName && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {companyName}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {ownerName}
                  </span>
                  {daysInPipeline !== null && <span>{daysInPipeline} dni w lejku</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <ContactTimeline state={timelineState} />
                <ContactTasksInline contactId={dtc.contact_id} />
                {active && (
                  <DecisionButtons
                    state={timelineState}
                    contactId={dtc.id}
                    teamId={teamId}
                    tenantId={dtc.tenant_id}
                    odprawaSessionId={active.id}
                    onDecisionLogged={handleDecisionLogged}
                  />
                )}
                <OperationalActions contact={dtc} teamId={teamId} tenantId={dtc.tenant_id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
