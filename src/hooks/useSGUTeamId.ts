import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSGUTeamId() {
  const { data, isLoading } = useQuery({
    queryKey: ['sgu-team-id'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sgu_settings')
        .select('sgu_team_id, enable_sgu_layout')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

  return {
    sguTeamId: data?.sgu_team_id ?? null,
    enabled: !!data?.enable_sgu_layout,
    isLoading,
  };
}
