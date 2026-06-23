import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useCurrentDirector } from '@/hooks/useDirectors';

export type NextStepsScope = 'mine' | 'all';

export interface NextStepRow {
  dtc_id: string;
  contact_id: string;
  companyName: string;
  fullName: string;
  next_action: string | null;
  next_action_date: string;
  assignedName: string | null;
}

export interface NextStepsResult {
  overdue: NextStepRow[];
  today: NextStepRow[];
  thisWeek: NextStepRow[];
  withoutNextStepCount: number;
}

function localTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function addDaysISO(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

interface RawRow {
  id: string;
  contact_id: string | null;
  next_action: string | null;
  next_action_date: string | null;
  assigned_to: string | null;
  contact:
    | {
        full_name: string | null;
        company: string | null;
        company_id: string | null;
        company_rel: { name: string | null } | null;
      }
    | null;
}

export function useSGUNextSteps(scope: NextStepsScope) {
  const { sguTeamId } = useSGUTeamId();
  const { data: currentDirector } = useCurrentDirector();
  const directorId = currentDirector?.id ?? null;

  return useQuery<NextStepsResult>({
    queryKey: ['sgu-next-steps', sguTeamId, scope, directorId],
    enabled: !!sguTeamId && (scope === 'all' || !!directorId),
    staleTime: 60_000,
    queryFn: async () => {
      const today = localTodayISO();
      const weekEnd = addDaysISO(today, 7);

      // Active funnel base filter
      let base = supabase
        .from('deal_team_contacts')
        .select(
          `id, contact_id, next_action, next_action_date, assigned_to,
           contact:contacts!deal_team_contacts_contact_id_fkey(
             full_name, company, company_id,
             company_rel:companies(name)
           )`
        )
        .eq('deal_team_id', sguTeamId as string)
        .eq('is_lost', false)
        .neq('category', 'client')
        .not('next_action_date', 'is', null)
        .lte('next_action_date', weekEnd)
        .order('next_action_date', { ascending: true })
        .limit(500);

      if (scope === 'mine' && directorId) {
        base = base.eq('assigned_to', directorId);
      }

      const { data, error } = await base;
      if (error) throw error;

      // Director name lookup (small set)
      const { data: directors } = await supabase
        .from('directors')
        .select('id, full_name');
      const dirMap = new Map<string, string>();
      for (const d of directors ?? []) {
        dirMap.set(d.id as string, (d.full_name as string) ?? '');
      }

      const rows: NextStepRow[] = ((data as unknown as RawRow[]) ?? [])
        .filter((r) => r.next_action_date && r.contact_id)
        .map((r) => ({
          dtc_id: r.id,
          contact_id: r.contact_id as string,
          companyName:
            r.contact?.company_rel?.name?.trim() ||
            r.contact?.company?.trim() ||
            '',
          fullName: r.contact?.full_name?.trim() ?? '',
          next_action: r.next_action,
          next_action_date: r.next_action_date as string,
          assignedName: r.assigned_to ? dirMap.get(r.assigned_to) ?? null : null,
        }));

      const overdue: NextStepRow[] = [];
      const todayBucket: NextStepRow[] = [];
      const thisWeek: NextStepRow[] = [];
      for (const r of rows) {
        if (r.next_action_date < today) overdue.push(r);
        else if (r.next_action_date === today) todayBucket.push(r);
        else thisWeek.push(r);
      }

      // Count of contacts without next_action_date in the same active-funnel scope
      let countQ = supabase
        .from('deal_team_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('deal_team_id', sguTeamId as string)
        .eq('is_lost', false)
        .neq('category', 'client')
        .is('next_action_date', null);
      if (scope === 'mine' && directorId) {
        countQ = countQ.eq('assigned_to', directorId);
      }
      const { count, error: countErr } = await countQ;
      if (countErr) throw countErr;

      return {
        overdue,
        today: todayBucket,
        thisWeek,
        withoutNextStepCount: count ?? 0,
      };
    },
  });
}