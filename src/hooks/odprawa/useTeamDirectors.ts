import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamDirector {
  id: string;
  full_name: string;
  email: string | null;
}

export function useTeamDirectors(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['team-directors', teamId],
    enabled: !!teamId,
    staleTime: 60_000,
    queryFn: async (): Promise<TeamDirector[]> => {
      // HOTFIX-ODPRAWA-2BUGS: Security definer RPC omija problemy z RLS na
      // deal_team_members (dropdown był pusty dla niektórych userów).
      // HOTFIX-ODPRAWA-2BUGS: RPC może jeszcze nie istnieć w types.ts (pending migration).
      // Cast through unknown by-passuje strict TS, runtime guard chroni przed null.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_team_directors', {
        p_team_id: teamId as string,
      });
      if (error) throw error;
      return (data ?? []) as TeamDirector[];
    },
  });
}
