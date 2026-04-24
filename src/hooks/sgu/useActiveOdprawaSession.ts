import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OdprawaSession {
  id: string;
  tenant_id: string;
  team_id: string;
  started_by: string;
  status: 'open' | 'closed' | 'abandoned';
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  covered_contact_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useActiveOdprawaSession(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['odprawa-active-session', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<OdprawaSession | null> => {
      const { data, error } = await supabase
        .from('odprawa_sessions' as never)
        .select('*')
        .eq('team_id', teamId as string)
        .eq('status', 'open')
        .maybeSingle();
      if (error) throw error;
      return (data as OdprawaSession | null) ?? null;
    },
    staleTime: 10_000,
  });
}