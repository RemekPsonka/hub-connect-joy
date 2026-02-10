import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamContactWeeklyStatus {
  id: string;
  team_id: string;
  team_contact_id: string;
  tenant_id: string;
  week_start: string;
  status_summary: string;
  next_steps: string | null;
  blockers: string | null;
  meeting_happened: boolean | null;
  meeting_outcome: string | null;
  category_recommendation: string | null;
  reported_by: string;
  created_at: string | null;
  reporter?: { id: string; full_name: string };
}

export function useTeamContactWeeklyStatuses(teamContactId: string | undefined) {
  return useQuery({
    queryKey: ['deal-contact-weekly-statuses', teamContactId],
    queryFn: async () => {
      if (!teamContactId) return [];

      const { data, error } = await supabase
        .from('deal_team_weekly_statuses')
        .select('*')
        .eq('team_contact_id', teamContactId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const reporterIds = [...new Set(data.map((s) => s.reported_by))];
      const { data: reporters } = await supabase
        .from('directors')
        .select('id, full_name')
        .in('id', reporterIds);

      const reporterMap = new Map(reporters?.map((r) => [r.id, r]) || []);

      return data.map((status) => ({
        ...status,
        reporter: reporterMap.get(status.reported_by),
      })) as TeamContactWeeklyStatus[];
    },
    enabled: !!teamContactId,
    staleTime: 30 * 1000,
  });
}
