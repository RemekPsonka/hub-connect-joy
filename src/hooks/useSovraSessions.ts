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
      // Sprint 04: zmiana ze `sovra_sessions` na `ai_conversations` (persona='sovra').
      // Pole `tasks_created` nieistniejące w nowym schemacie — zwracamy null (UI zignoruje).
      // Sortujemy po last_message_at (świeżość).
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, scope_type, title, started_at, last_message_at')
        .eq('persona', 'sovra')
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        // Mapowanie scope_type → "type" (UI używa do badge'a). Brak scope = "chat".
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
