import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';

export function useSGUClientCount() {
  const { sguTeamId } = useSGUTeamId();
  return useQuery({
    enabled: !!sguTeamId,
    queryKey: ['sgu-dashboard', 'client-count', sguTeamId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('deal_team_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', sguTeamId as string)
        .eq('category', 'client');
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 2 * 60_000,
  });
}