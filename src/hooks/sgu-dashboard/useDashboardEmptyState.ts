import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardEmptyState() {
  return useQuery({
    queryKey: ['sgu-dashboard', 'empty-state'],
    queryFn: async (): Promise<{ isEmpty: boolean; total: number }> => {
      const { count, error } = await supabase
        .from('deal_team_contacts')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;
      const total = count ?? 0;
      return { isEmpty: total === 0, total };
    },
    staleTime: 5 * 60_000,
  });
}
