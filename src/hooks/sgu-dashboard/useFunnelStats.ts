import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';

/**
 * SGU funnel buckets — driven by `offering_stage` + milestone timestamps.
 * Counts FIRMS (deal_team_contacts) of the SGU team, excluding `is_lost=true`.
 */
export type SGUFunnelBucketKey =
  | 'prospect'
  | 'meeting_scheduled'
  | 'after_k1'
  | 'handshake'
  | 'poa'
  | 'audit'
  | 'client';

export interface SGUFunnelBucket {
  key: SGUFunnelBucketKey;
  label: string;
  value: number;
  color: string;
}

interface Row {
  offering_stage: string | null;
  k1_meeting_done_at: string | null;
  handshake_at: string | null;
  poa_signed_at: string | null;
  audit_done_at: string | null;
  won_at: string | null;
  category: string | null;
  is_lost: boolean | null;
}

const BUCKETS: ReadonlyArray<{ key: SGUFunnelBucketKey; label: string; color: string }> = [
  { key: 'prospect', label: 'Prospekt', color: '#94a3b8' },
  { key: 'meeting_scheduled', label: 'Umówione spotkanie', color: '#0ea5e9' },
  { key: 'after_k1', label: 'Po spotkaniu (K1)', color: '#f59e0b' },
  { key: 'handshake', label: 'Uścisk dłoni (K2)', color: '#f97316' },
  { key: 'poa', label: 'Pełnomocnictwo', color: '#8b5cf6' },
  { key: 'audit', label: 'Audyt', color: '#6366f1' },
  { key: 'client', label: 'Klient', color: '#059669' },
];

function classify(r: Row): SGUFunnelBucketKey | null {
  if (r.won_at || r.category === 'client') return 'client';
  if (r.is_lost === true) return null;
  if (r.audit_done_at) return 'audit';
  if (r.poa_signed_at) return 'poa';
  if (r.handshake_at) return 'handshake';
  if (r.k1_meeting_done_at) return 'after_k1';
  if (r.offering_stage === 'meeting_scheduled') return 'meeting_scheduled';
  if (!r.offering_stage || r.offering_stage === 'meeting_plan') return 'prospect';
  return null;
}

export function useFunnelStats() {
  const { sguTeamId } = useSGUTeamId();

  return useQuery({
    enabled: !!sguTeamId,
    queryKey: ['sgu-dashboard', 'funnel-buckets', sguTeamId],
    queryFn: async (): Promise<SGUFunnelBucket[]> => {
      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select(
          'offering_stage,k1_meeting_done_at,handshake_at,poa_signed_at,audit_done_at,won_at,category,is_lost'
        )
        .eq('team_id', sguTeamId as string);
      if (error) throw error;

      const counts: Record<SGUFunnelBucketKey, number> = {
        prospect: 0,
        meeting_scheduled: 0,
        after_k1: 0,
        handshake: 0,
        poa: 0,
        audit: 0,
        client: 0,
      };
      for (const r of (data ?? []) as Row[]) {
        const k = classify(r);
        if (k) counts[k] += 1;
      }
      return BUCKETS.map((b) => ({ ...b, value: counts[b.key] }));
    },
    staleTime: 2 * 60_000,
  });
}
