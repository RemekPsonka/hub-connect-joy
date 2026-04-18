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

export type SovraScopeFilter = 'all' | 'global' | 'contact' | 'project' | 'deal' | 'meeting';

export function useSovraSessions(scopeFilter: SovraScopeFilter = 'all') {
  const { director } = useAuth();
  const directorId = director?.id;

  return useQuery({
    queryKey: ['sovra-sessions', directorId, scopeFilter],
    queryFn: async () => {
      // Sprint 04/06: ai_conversations (persona='sovra'), opcjonalny filtr scope_type.
      let q = supabase
        .from('ai_conversations')
        .select('id, scope_type, title, started_at, last_message_at')
        .eq('persona', 'sovra')
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (scopeFilter === 'global') {
        q = q.or('scope_type.is.null,scope_type.eq.global');
      } else if (scopeFilter !== 'all') {
        q = q.eq('scope_type', scopeFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        type: row.scope_type && row.scope_type !== 'global' ? row.scope_type : 'chat',
        title: row.title,
        started_at: row.last_message_at ?? row.started_at,
        tasks_created: null,
      })) as SovraSession[];
    },
    enabled: !!directorId,
    staleTime: 30_000,
  });
}
