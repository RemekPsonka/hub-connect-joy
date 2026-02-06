import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SovraSession {
  id: string;
  type: string;
  title: string | null;
  started_at: string | null;
  tasks_created: number | null;
}

export function useSovraSessions() {
  const { director } = useAuth();
  const directorId = director?.id;

  return useQuery({
    queryKey: ['sovra-sessions', directorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sovra_sessions')
        .select('id, type, title, started_at, tasks_created')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as SovraSession[];
    },
    enabled: !!directorId,
    staleTime: 30_000,
  });
}
