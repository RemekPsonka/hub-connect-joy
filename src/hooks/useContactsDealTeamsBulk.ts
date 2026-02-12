import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BulkContactDealTeam {
  id: string;
  team_id: string;
  contact_id: string;
  category: string;
  status: string;
  team_name: string;
  team_color: string;
}

export function useContactsDealTeamsBulk(contactIds: string[]) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['contact-deal-teams-bulk', contactIds.sort().join(',')],
    queryFn: async () => {
      if (!tenantId || contactIds.length === 0) return new Map<string, BulkContactDealTeam[]>();

      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select('id, team_id, contact_id, category, status, deal_teams(name, color)')
        .eq('tenant_id', tenantId)
        .in('contact_id', contactIds)
        .not('status', 'in', '("won","lost","disqualified")');

      if (error) throw error;

      const map = new Map<string, BulkContactDealTeam[]>();
      for (const item of data || []) {
        const entry: BulkContactDealTeam = {
          id: item.id,
          team_id: item.team_id,
          contact_id: item.contact_id,
          category: item.category,
          status: item.status,
          team_name: (item as any).deal_teams?.name || 'Zespół',
          team_color: (item as any).deal_teams?.color || '#6366f1',
        };
        const existing = map.get(item.contact_id) || [];
        existing.push(entry);
        map.set(item.contact_id, existing);
      }
      return map;
    },
    enabled: !!tenantId && contactIds.length > 0,
    staleTime: 30 * 1000,
  });
}
