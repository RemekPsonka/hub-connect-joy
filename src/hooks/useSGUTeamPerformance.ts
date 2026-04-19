import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SGUTeamPerformanceRow {
  recipient_user_id: string | null;
  full_name?: string | null;
  email?: string | null;
  policies_count?: number;
  booked_premium_gr?: number;
  collected_premium_gr?: number;
  commission_earned_gr?: number;
  [key: string]: unknown;
}

export function useSGUTeamPerformance(weekOffset = 0) {
  return useQuery({
    queryKey: ['sgu-team-performance', weekOffset],
    queryFn: async (): Promise<SGUTeamPerformanceRow[]> => {
      const { data, error } = await supabase.rpc('rpc_sgu_team_performance', {
        p_week_offset: weekOffset,
      });
      if (error) throw error;
      if (!data) return [];
      // RPC returns jsonb (could be array or wrapped object)
      if (Array.isArray(data)) return data as SGUTeamPerformanceRow[];
      if (typeof data === 'object' && data !== null && Array.isArray((data as { rows?: unknown }).rows)) {
        return (data as { rows: SGUTeamPerformanceRow[] }).rows;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
