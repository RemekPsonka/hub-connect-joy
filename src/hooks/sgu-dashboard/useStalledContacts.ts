import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OFFERING_STAGE_LABELS, type OfferingStage } from '@/types/dealTeam';

export interface StalledContact {
  id: string;
  team_id: string;
  full_name: string;
  offering_stage: OfferingStage;
  offering_stage_label: string;
  updated_at: string | null;
  days_since_update: number;
  next_action_date: string | null;
  next_action: string | null;
}

export interface StalledContactsResult {
  totalStalled: number;
  byStage: Partial<Record<OfferingStage, number>>;
  contacts: StalledContact[];
  stalledIds: Set<string>;
}

const ACTIVE_TASK_STATUSES = ['todo', 'pending', 'in_progress'];

function daysBetween(fromIso: string | null): number {
  if (!fromIso) return 0;
  const ms = Date.now() - new Date(fromIso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function useStalledContacts(teamId?: string) {
  return useQuery<StalledContactsResult>({
    queryKey: ['stalled-contacts', teamId ?? 'all'],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<StalledContactsResult> => {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Pobierz wszystkie aktywne kontakty w lejku ofertowania
      let q = supabase
        .from('deal_team_contacts')
        .select(`
          id,
          team_id,
          offering_stage,
          updated_at,
          next_action_date,
          next_action,
          contact:contacts!deal_team_contacts_contact_id_fkey(full_name)
        `)
        .eq('deal_stage', 'offering')
        .eq('is_lost', false)
        .not('offering_stage', 'in', '("won","lost")');

      if (teamId) q = q.eq('team_id', teamId);

      const { data: rows, error } = await q.limit(500);
      if (error) throw error;
      if (!rows || rows.length === 0) {
        return { totalStalled: 0, byStage: {}, contacts: [], stalledIds: new Set() };
      }

      const candidateIds = rows.map((r) => r.id);

      // 2. Pobierz id kontaktów które MAJĄ aktywne taski → anti-join po stronie klienta
      const { data: activeTasks, error: tErr } = await supabase
        .from('tasks')
        .select('deal_team_contact_id')
        .in('deal_team_contact_id', candidateIds)
        .in('status', ACTIVE_TASK_STATUSES);
      if (tErr) throw tErr;

      const withActiveTask = new Set(
        (activeTasks ?? [])
          .map((t) => t.deal_team_contact_id)
          .filter((x): x is string => !!x),
      );

      // 3. Filtr: brak otwartego taska AND (next_action_date jest null lub w przeszłości)
      const stalled: StalledContact[] = [];
      const byStage: Partial<Record<OfferingStage, number>> = {};

      for (const r of rows) {
        if (withActiveTask.has(r.id)) continue;
        if (r.next_action_date && r.next_action_date >= today) continue;

        const stage = r.offering_stage as OfferingStage | null;
        if (!stage) continue;

        const fullName =
          (r.contact as { full_name?: string | null } | null)?.full_name ?? 'Bez nazwy';

        stalled.push({
          id: r.id,
          team_id: r.team_id,
          full_name: fullName,
          offering_stage: stage,
          offering_stage_label: OFFERING_STAGE_LABELS[stage] ?? stage,
          updated_at: r.updated_at,
          days_since_update: daysBetween(r.updated_at),
          next_action_date: r.next_action_date,
          next_action: r.next_action,
        });
        byStage[stage] = (byStage[stage] ?? 0) + 1;
      }

      stalled.sort((a, b) => b.days_since_update - a.days_since_update);

      return {
        totalStalled: stalled.length,
        byStage,
        contacts: stalled,
        stalledIds: new Set(stalled.map((s) => s.id)),
      };
    },
  });
}