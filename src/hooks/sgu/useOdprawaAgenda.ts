import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OdprawaAgendaItem {
  deal_team_contact_id: string;
  contact_id: string | null;
  contact_name: string | null;
  company_name: string | null;
  offering_stage: string | null;
  temperature: string | null;
  category: string | null;
  status: string | null;
  next_action_date: string | null;
  last_status_update: string | null;
  assigned_to: string | null;
  open_questions_count: number;
  has_active_task: boolean;
  is_stalled: boolean;
  priority_bucket: number;
  last_decision_at: string | null;
}

export function useOdprawaAgenda(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['odprawa-agenda', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<OdprawaAgendaItem[]> => {
      const { data, error } = await supabase.rpc('get_odprawa_agenda' as never, {
        p_team_id: teamId,
      } as never);
      if (error) throw error;
      return (data ?? []) as OdprawaAgendaItem[];
    },
    staleTime: 30_000,
  });
}