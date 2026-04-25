import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Result {
  discussedContactIds: Set<string>;
}

export function useOdprawaSessionDecisions(
  sessionId: string | null,
  teamId: string | null,
): Result {
  const { data } = useQuery({
    queryKey: ['odprawa-session-decisions', sessionId],
    enabled: !!sessionId && !!teamId,
    staleTime: 30_000,
    queryFn: async (): Promise<string[]> => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('meeting_decisions')
        .select('deal_team_contact_id, deal_team_contacts!inner(contact_id)')
        .eq('odprawa_session_id', sessionId);
      if (error) throw error;
      const ids = (data ?? [])
        .map((r: { deal_team_contacts: { contact_id: string } | null }) =>
          r.deal_team_contacts?.contact_id ?? null,
        )
        .filter((x): x is string => !!x);
      return ids;
    },
  });

  return { discussedContactIds: new Set(data ?? []) };
}
