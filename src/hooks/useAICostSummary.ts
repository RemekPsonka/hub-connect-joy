import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AICostSummaryRow {
  day: string;
  function_name: string;
  provider: string;
  total_cost_cents: number;
  total_tokens_in: number;
  total_tokens_out: number;
  call_count: number;
}

export function useAICostSummary(daysBack: number = 30) {
  return useQuery({
    queryKey: ['ai-cost-summary', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_ai_cost_summary' as never, {
        p_days_back: daysBack,
      } as never);
      if (error) throw error;
      return ((data ?? []) as unknown as AICostSummaryRow[]).map((r) => ({
        ...r,
        total_cost_cents: Number(r.total_cost_cents),
        total_tokens_in: Number(r.total_tokens_in),
        total_tokens_out: Number(r.total_tokens_out),
        call_count: Number(r.call_count),
      }));
    },
    staleTime: 60 * 1000,
  });
}
