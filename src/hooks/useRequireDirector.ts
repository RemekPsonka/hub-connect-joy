import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Sprint S1 — guard hook ensuring a deal_team_contact has an assigned director
 * before any task-creation action runs. UI-side mirror of the DB trigger
 * `require_director_on_dtc_task` (so we get a friendly toast instead of a
 * raw RAISE EXCEPTION).
 */
export function useRequireDirector(dtcId: string | undefined | null) {
  const { data: dtc } = useQuery({
    queryKey: ['dtc-director-check', dtcId],
    queryFn: async () => {
      if (!dtcId) return null;
      const { data } = await supabase
        .from('deal_team_contacts')
        .select('id, assigned_to')
        .eq('id', dtcId)
        .maybeSingle();
      return data;
    },
    enabled: !!dtcId,
    staleTime: 30_000,
  });

  return {
    hasDirector: !!dtc?.assigned_to,
    dtcId: dtcId ?? undefined,
  };
}
