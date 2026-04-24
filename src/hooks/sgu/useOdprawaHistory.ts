import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OdprawaSession } from './useActiveOdprawaSession';

export function useOdprawaHistory(teamId: string | null | undefined, limit = 50) {
  return useQuery({
    queryKey: ['odprawa-history', teamId, limit],
    enabled: !!teamId,
    queryFn: async (): Promise<OdprawaSession[]> => {
      const { data, error } = await supabase
        .from('odprawa_sessions' as never)
        .select('*')
        .eq('team_id', teamId as string)
        .neq('status', 'open')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as OdprawaSession[];
    },
    staleTime: 30_000,
  });
}