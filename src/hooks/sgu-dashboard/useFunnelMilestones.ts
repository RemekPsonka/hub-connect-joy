import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FunnelMilestoneCounts {
  k1: number;
  k2a: number;
  k2b: number;
  k3: number;
  k4: number;
}

export interface FunnelConversion {
  k1_to_k2a: number;
  k2a_to_k2b: number;
  k2b_to_k3: number;
  k3_to_k4: number;
}

export interface FunnelMilestones extends FunnelMilestoneCounts {
  conversion: FunnelConversion;
}

const COLUMNS: Array<{ key: keyof FunnelMilestoneCounts; column: string }> = [
  { key: 'k1', column: 'k1_meeting_done_at' },
  { key: 'k2a', column: 'handshake_at' },
  { key: 'k2b', column: 'poa_signed_at' },
  { key: 'k3', column: 'audit_done_at' },
  { key: 'k4', column: 'won_at' },
];

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function useFunnelMilestones() {
  return useQuery({
    queryKey: ['sgu-dashboard', 'funnel-milestones'],
    queryFn: async (): Promise<FunnelMilestones> => {
      const results = await Promise.all(
        COLUMNS.map(({ column }) =>
          supabase
            .from('deal_team_contacts')
            .select('id', { count: 'exact', head: true })
            .not(column, 'is', null)
            .neq('deal_stage', 'lost'),
        ),
      );
      const counts: FunnelMilestoneCounts = { k1: 0, k2a: 0, k2b: 0, k3: 0, k4: 0 };
      COLUMNS.forEach(({ key }, i) => {
        counts[key] = results[i].count ?? 0;
      });
      return {
        ...counts,
        conversion: {
          k1_to_k2a: pct(counts.k2a, counts.k1),
          k2a_to_k2b: pct(counts.k2b, counts.k2a),
          k2b_to_k3: pct(counts.k3, counts.k2b),
          k3_to_k4: pct(counts.k4, counts.k3),
        },
      };
    },
    staleTime: 5 * 60_000,
  });
}