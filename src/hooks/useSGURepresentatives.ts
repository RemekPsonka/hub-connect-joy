import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SGURepresentativeProfile, RepStatusFilter } from '@/types/sgu-representative';

export function useSGURepresentatives(status: RepStatusFilter = 'active') {
  return useQuery({
    queryKey: ['sgu-representatives', status],
    queryFn: async (): Promise<SGURepresentativeProfile[]> => {
      let query = supabase
        .from('sgu_representative_profiles')
        .select('*')
        .order('last_name', { ascending: true });

      if (status === 'active') query = query.eq('active', true);
      if (status === 'deactivated') query = query.eq('active', false);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as SGURepresentativeProfile[];
    },
  });
}
