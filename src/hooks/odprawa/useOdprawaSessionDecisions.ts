import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Result {
  discussedContactIds: Set<string>;
}

export function useOdprawaSessionDecisions(
  sessionId: string | null,
  teamId: string | null,
  sessionStartedAt: string | null = null,
): Result {
  const { data } = useQuery({
    queryKey: ['odprawa-session-decisions', sessionId, sessionStartedAt],
    enabled: !!sessionId && !!teamId,
    staleTime: 30_000,
    queryFn: async (): Promise<string[]> => {
      if (!sessionId) return [];

      // Source 1: meeting_decisions z odprawa_session_id
      const decisionsP = supabase
        .from('meeting_decisions')
        .select('deal_team_contact_id, deal_team_contacts!inner(contact_id)')
        .eq('odprawa_session_id', sessionId);

      // Source 2: tasks utworzone w sesji (fallback — NextStepDialog template
      // może utworzyć task bez wcześniejszego meeting_decision dla danego kontaktu)
      const tasksP =
        sessionStartedAt && teamId
          ? supabase
              .from('tasks')
              .select(
                'deal_team_contact_id, deal_team_contacts!inner(contact_id, team_id)',
              )
              .gte('created_at', sessionStartedAt)
              .eq('deal_team_contacts.team_id', teamId)
              .not('deal_team_contact_id', 'is', null)
          : Promise.resolve({ data: [] as unknown[], error: null });

      const [decRes, tasksRes] = await Promise.all([decisionsP, tasksP]);
      if (decRes.error) throw decRes.error;
      if ('error' in tasksRes && tasksRes.error) throw tasksRes.error;

      const ids = new Set<string>();
      for (const r of (decRes.data ?? []) as Array<{
        deal_team_contacts: { contact_id: string } | null;
      }>) {
        if (r.deal_team_contacts?.contact_id) ids.add(r.deal_team_contacts.contact_id);
      }
      for (const r of ((tasksRes.data ?? []) as Array<{
        deal_team_contacts: { contact_id: string } | null;
      }>)) {
        if (r.deal_team_contacts?.contact_id) ids.add(r.deal_team_contacts.contact_id);
      }
      return Array.from(ids);
    },
  });

  return { discussedContactIds: new Set(data ?? []) };
}
