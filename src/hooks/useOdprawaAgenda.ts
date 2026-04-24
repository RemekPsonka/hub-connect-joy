import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type OdprawaAgendaRow = {
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  stage: string | null;
  temperature: string | null;
  is_lost: boolean | null;
  next_action_date: string | null;
  last_status_update: string | null;
  priority_bucket: '10x' | 'stalled' | 'due_soon' | 'other';
  priority_rank: number;
  active_task_count: number;
};

export function useOdprawaAgenda(teamId: string | null | undefined, mode: string = 'standard') {
  return useQuery({
    queryKey: ['odprawa-agenda', teamId, mode],
    enabled: !!teamId,
    queryFn: async (): Promise<OdprawaAgendaRow[]> => {
      const { data, error } = await supabase.rpc('get_odprawa_agenda', {
        p_team_id: teamId as string,
        p_mode: mode,
      });
      if (error) throw error;
      return (data ?? []) as unknown as OdprawaAgendaRow[];
    },
    staleTime: 30_000,
  });
}
