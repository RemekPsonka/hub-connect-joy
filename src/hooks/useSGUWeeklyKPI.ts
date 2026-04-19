import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SGUWeeklyKPI {
  week_start?: string;
  meetings_count?: number;
  policies_issued_count?: number;
  commission_earned_gr?: number;
  premium_collected_gr?: number;
  prev_meetings_count?: number;
  prev_policies_issued_count?: number;
  prev_commission_earned_gr?: number;
  prev_premium_collected_gr?: number;
  // shape may include deltas; we compute on FE if absent
  [key: string]: unknown;
}

export function useSGUWeeklyKPI(weekOffset = 0) {
  return useQuery({
    queryKey: ['sgu-weekly-kpi', weekOffset],
    queryFn: async (): Promise<SGUWeeklyKPI | null> => {
      const { data, error } = await supabase.rpc('rpc_sgu_weekly_kpi', {
        p_week_offset: weekOffset,
      });
      if (error) throw error;
      return (data ?? null) as SGUWeeklyKPI | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
