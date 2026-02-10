import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogEntry {
  id: string;
  team_id: string;
  team_contact_id: string | null;
  prospect_id: string | null;
  actor_id: string;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  created_at: string | null;
  actor?: { id: string; full_name: string };
}

export function useContactActivityLog(teamContactId: string | undefined) {
  return useQuery({
    queryKey: ['deal-contact-activity-log', teamContactId],
    queryFn: async () => {
      if (!teamContactId) return [];

      const { data, error } = await supabase
        .from('deal_team_activity_log')
        .select('*')
        .eq('team_contact_id', teamContactId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch actor names
      const actorIds = [...new Set(data.map((e) => e.actor_id))];
      const { data: actors } = await supabase
        .from('directors')
        .select('id, full_name')
        .in('id', actorIds);

      const actorMap = new Map(actors?.map((a) => [a.id, a]) || []);

      return data.map((entry) => ({
        ...entry,
        actor: actorMap.get(entry.actor_id),
      })) as ActivityLogEntry[];
    },
    enabled: !!teamContactId,
    staleTime: 30 * 1000,
  });
}
