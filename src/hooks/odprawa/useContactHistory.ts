import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OFFERING_STAGE_LABEL, type OfferingStage } from '@/lib/offeringStageLabels';

export type HistoryEventType =
  | 'decision'
  | 'task_completed'
  | 'note'
  | 'stage_change'
  | 'milestone_reached';

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  timestamp: string;
  label: string;
  detail: string | null;
  actorName: string;
}

const DECISION_LABEL: Record<string, string> = {
  go: 'Decyzja: Idziemy dalej',
  postponed: 'Decyzja: Odłożone',
  dead: 'Decyzja: Kontakt utracony',
  push: 'Decyzja: Push (follow-up)',
  klient: 'Decyzja: Klient',
};

function stageLabel(s: string | null | undefined): string {
  if (!s) return '—';
  return OFFERING_STAGE_LABEL[s as OfferingStage] ?? s;
}

interface DecisionRow {
  id: string;
  created_at: string;
  decision_type: string;
  notes: string | null;
  dead_reason: string | null;
  postponed_until: string | null;
  next_action_date: string | null;
  prev_offering_stage: string | null;
  created_by: string | null;
}
interface TaskRow {
  id: string;
  title: string | null;
  status: string;
  updated_at: string;
  assigned_to: string | null;
  owner_id: string | null;
}
interface ActivityRow {
  id: string;
  created_at: string;
  action: string;
  new_value: Record<string, unknown> | null;
  actor_id: string | null;
}

interface ContactCurrent {
  offering_stage: string | null;
  k1_meeting_done_at: string | null;
  handshake_at: string | null;
  poa_signed_at: string | null;
  audit_done_at: string | null;
  won_at: string | null;
  lost_at: string | null;
}

const HISTORY_LIMIT = 20;

export function useContactHistory(
  dealTeamContactId: string | undefined,
  teamContactId?: string | undefined,
) {
  return useQuery({
    queryKey: ['odprawa-contact-history', dealTeamContactId],
    enabled: !!dealTeamContactId,
    queryFn: async (): Promise<HistoryEvent[]> => {
      if (!dealTeamContactId) return [];
      const tcId = teamContactId ?? dealTeamContactId;

      const [decisionsRes, tasksRes, activityRes, contactRes] = await Promise.all([
        supabase
          .from('meeting_decisions')
          .select(
            'id, created_at, decision_type, notes, dead_reason, postponed_until, next_action_date, prev_offering_stage, created_by',
          )
          .eq('deal_team_contact_id', dealTeamContactId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('tasks')
          .select('id, title, status, updated_at, assigned_to, owner_id')
          .eq('deal_team_contact_id', dealTeamContactId)
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(50),
        supabase
          .from('deal_team_activity_log')
          .select('id, created_at, action, new_value, actor_id')
          .eq('team_contact_id', tcId)
          .eq('action', 'note_added')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('deal_team_contacts')
          .select(
            'offering_stage, k1_meeting_done_at, handshake_at, poa_signed_at, audit_done_at, won_at, lost_at',
          )
          .eq('id', dealTeamContactId)
          .maybeSingle(),
      ]);

      if (decisionsRes.error) throw decisionsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (activityRes.error) throw activityRes.error;
      if (contactRes.error) throw contactRes.error;

      const decisions = (decisionsRes.data ?? []) as DecisionRow[];
      const tasks = (tasksRes.data ?? []) as TaskRow[];
      const activity = (activityRes.data ?? []) as ActivityRow[];
      const current = (contactRes.data as ContactCurrent | null) ?? null;

      // Resolve actor names: director.id (decisions.created_by, tasks.assigned_to/owner_id)
      // + auth.users.id (activity.actor_id) → directors.user_id.
      const directorIds = new Set<string>();
      const userIds = new Set<string>();
      for (const d of decisions) if (d.created_by) directorIds.add(d.created_by);
      for (const t of tasks) {
        const a = t.assigned_to ?? t.owner_id;
        if (a) directorIds.add(a);
      }
      for (const a of activity) if (a.actor_id) userIds.add(a.actor_id);

      const [byIdRes, byUserIdRes] = await Promise.all([
        directorIds.size
          ? supabase
              .from('directors')
              .select('id, full_name')
              .in('id', Array.from(directorIds))
          : Promise.resolve({ data: [], error: null }),
        userIds.size
          ? supabase
              .from('directors')
              .select('user_id, full_name')
              .in('user_id', Array.from(userIds))
          : Promise.resolve({ data: [], error: null }),
      ]);
      if ('error' in byIdRes && byIdRes.error) throw byIdRes.error;
      if ('error' in byUserIdRes && byUserIdRes.error) throw byUserIdRes.error;

      const nameByDirectorId = new Map<string, string>();
      for (const r of (byIdRes.data ?? []) as Array<{ id: string; full_name: string | null }>) {
        nameByDirectorId.set(r.id, r.full_name ?? 'Dyrektor');
      }
      const nameByUserId = new Map<string, string>();
      for (const r of (byUserIdRes.data ?? []) as Array<{
        user_id: string;
        full_name: string | null;
      }>) {
        nameByUserId.set(r.user_id, r.full_name ?? 'Dyrektor');
      }

      const events: HistoryEvent[] = [];

      // 1) decisions
      for (const d of decisions) {
        const baseLabel = DECISION_LABEL[d.decision_type] ?? `Decyzja: ${d.decision_type}`;
        let detail: string | null = d.notes?.trim() || null;
        if (d.decision_type === 'dead' && d.dead_reason) detail = `Powód: ${d.dead_reason}`;
        else if (d.decision_type === 'postponed' && d.postponed_until)
          detail = `Do: ${d.postponed_until}`;
        else if (d.decision_type === 'go' && d.next_action_date)
          detail = `Następna akcja: ${d.next_action_date}`;
        events.push({
          id: `decision:${d.id}`,
          type: 'decision',
          timestamp: d.created_at,
          label: baseLabel,
          detail,
          actorName: (d.created_by && nameByDirectorId.get(d.created_by)) || 'System',
        });

        // Stage change: jeśli kolejna decyzja (chronologicznie wcześniejsza w array,
        // bo DESC) miała inny prev_offering_stage — stage się zmienił. Najprościej
        // wyciągnąć każdy prev → next (next = prev z DECYZJI o krok wcześniej, lub
        // current dla najnowszej). Dla MVP: pokażmy TYLKO gdy mamy oba.
      }

      // Stage transitions: sort decisions ASC, build prev->next chain.
      const decAsc = [...decisions].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );
      for (let i = 0; i < decAsc.length; i++) {
        const d = decAsc[i];
        if (!d.prev_offering_stage) continue;
        const nextStage =
          i + 1 < decAsc.length
            ? decAsc[i + 1].prev_offering_stage
            : current?.offering_stage ?? null;
        if (!nextStage || nextStage === d.prev_offering_stage) continue;
        events.push({
          id: `stage:${d.id}`,
          type: 'stage_change',
          timestamp: d.created_at,
          label: `Etap: ${stageLabel(d.prev_offering_stage)} → ${stageLabel(nextStage)}`,
          detail: null,
          actorName: (d.created_by && nameByDirectorId.get(d.created_by)) || 'System',
        });
      }

      // 2) tasks completed
      for (const t of tasks) {
        const directorId = t.assigned_to ?? t.owner_id;
        events.push({
          id: `task:${t.id}`,
          type: 'task_completed',
          timestamp: t.updated_at,
          label: `Zadanie wykonane: ${t.title ?? '(bez tytułu)'}`,
          detail: null,
          actorName: (directorId && nameByDirectorId.get(directorId)) || 'Dyrektor',
        });
      }

      // 3) notes
      for (const a of activity) {
        const note =
          a.new_value && typeof a.new_value === 'object'
            ? String((a.new_value as Record<string, unknown>).note ?? '')
            : '';
        events.push({
          id: `note:${a.id}`,
          type: 'note',
          timestamp: a.created_at,
          label: 'Notatka',
          detail: note || null,
          actorName: (a.actor_id && nameByUserId.get(a.actor_id)) || 'Użytkownik',
        });
      }

      // 4) milestones reached (z deal_team_contacts.*_at)
      const milestones: Array<{ col: string; label: string; value: string | null }> = [
        { col: 'k1_meeting_done_at', label: 'K1 Spotkanie odbyte', value: current?.k1_meeting_done_at ?? null },
        { col: 'handshake_at', label: 'K2 Handshake', value: current?.handshake_at ?? null },
        { col: 'poa_signed_at', label: 'K2+ Pełnomocnictwo', value: current?.poa_signed_at ?? null },
        { col: 'audit_done_at', label: 'K3 Audyt zrobiony', value: current?.audit_done_at ?? null },
        { col: 'won_at', label: 'K4 Klient', value: current?.won_at ?? null },
        { col: 'lost_at', label: 'Utracony', value: current?.lost_at ?? null },
      ];
      for (const m of milestones) {
        if (!m.value) continue;
        events.push({
          id: `milestone:${m.col}`,
          type: 'milestone_reached',
          timestamp: m.value,
          label: m.label,
          detail: null,
          actorName: 'System',
        });
      }

      events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return events.slice(0, HISTORY_LIMIT);
    },
    staleTime: 30_000,
  });
}
