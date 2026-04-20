import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FunnelStats {
  top_count: number;
  audit_count: number;
  hot_count: number;
  offering_count: number;
  client_count: number;
}

const STAGE_KEYS: Array<{ key: keyof FunnelStats; stage: string }> = [
  { key: 'top_count', stage: 'top' },
  { key: 'audit_count', stage: 'audit' },
  { key: 'hot_count', stage: 'hot' },
  { key: 'offering_count', stage: 'offering' },
  { key: 'client_count', stage: 'client' },
];

export function useFunnelStats() {
  return useQuery({
    queryKey: ['sgu-dashboard', 'funnel-stats'],
    queryFn: async (): Promise<FunnelStats> => {
      const results = await Promise.all(
        STAGE_KEYS.map(({ stage }) =>
          supabase
            .from('deal_team_contacts')
            .select('id', { count: 'exact', head: true })
            .eq('deal_stage', stage)
        )
      );
      const stats: FunnelStats = {
        top_count: 0,
        audit_count: 0,
        hot_count: 0,
        offering_count: 0,
        client_count: 0,
      };
      STAGE_KEYS.forEach(({ key }, i) => {
        stats[key] = results[i].count ?? 0;
      });
      return stats;
    },
    staleTime: 2 * 60_000,
  });
}
