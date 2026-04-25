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
      const { data, error } = await supabase
        .from('deal_team_members')
        .select('director:directors!inner(id, full_name, email)')
        .eq('team_id', teamId as string)
        .eq('is_active', true);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ director: TeamDirector | null }>;
      return rows
        .map((r) => r.director)
        .filter((d): d is TeamDirector => !!d && !!d.id);
    },
  });
}