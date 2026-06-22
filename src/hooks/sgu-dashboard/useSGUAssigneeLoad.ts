import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';

export interface AssigneeLoadRow {
  assignedTo: string | null;
  fullName: string | null;
  email: string | null;
  count: number;
}

/**
 * Groups active SGU pipeline contacts (excluding lost + clients)
 * by `assigned_to`, returning sorted load list. NULL group is returned
 * as the first entry when present.
 */
export function useSGUAssigneeLoad() {
  const { sguTeamId } = useSGUTeamId();
  return useQuery({
    enabled: !!sguTeamId,
    queryKey: ['sgu-dashboard', 'assignee-load', sguTeamId],
    queryFn: async (): Promise<{ unassigned: number; assigned: AssigneeLoadRow[] }> => {
      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select('assigned_to, category, is_lost')
        .eq('team_id', sguTeamId as string);
      if (error) throw error;

      const counts = new Map<string, number>();
      let unassigned = 0;
      for (const row of (data ?? []) as Array<{
        assigned_to: string | null;
        category: string | null;
        is_lost: boolean | null;
      }>) {
        if (row.is_lost === true) continue;
        if (row.category === 'client') continue;
        if (!row.assigned_to) {
          unassigned += 1;
        } else {
          counts.set(row.assigned_to, (counts.get(row.assigned_to) ?? 0) + 1);
        }
      }

      const ids = Array.from(counts.keys());
      let names = new Map<string, { full_name: string | null; email: string | null }>();
      if (ids.length > 0) {
        const { data: dirs, error: dirErr } = await supabase
          .from('directors')
          .select('id, full_name, email')
          .in('id', ids);
        if (dirErr) throw dirErr;
        names = new Map(
          (dirs ?? []).map((d) => [d.id as string, { full_name: d.full_name, email: d.email }])
        );
      }

      const assigned: AssigneeLoadRow[] = ids
        .map((id) => ({
          assignedTo: id,
          fullName: names.get(id)?.full_name ?? null,
          email: names.get(id)?.email ?? null,
          count: counts.get(id) ?? 0,
        }))
        .sort((a, b) => b.count - a.count);

      return { unassigned, assigned };
    },
    staleTime: 2 * 60_000,
  });
}