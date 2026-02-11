import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactDealTeam {
  id: string;
  team_id: string;
  category: string;
  status: string;
  team_name: string;
  team_color: string;
}

export function useContactDealTeams(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-deal-teams', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select('id, team_id, category, status, deal_teams(name, color)')
        .eq('contact_id', contactId);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        team_id: item.team_id,
        category: item.category,
        status: item.status,
        team_name: item.deal_teams?.name || 'Zespół',
        team_color: item.deal_teams?.color || '#6366f1',
      })) as ContactDealTeam[];
    },
    enabled: !!contactId,
  });
}
