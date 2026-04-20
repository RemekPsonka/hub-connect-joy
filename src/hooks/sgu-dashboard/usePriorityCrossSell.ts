import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardPriorityItem } from '@/types/sgu-dashboard';

const AREA_LABELS: Record<string, string> = {
  potential_property_gr: 'majątek',
  potential_life_group_gr: 'życie/grupowe',
  potential_communication_gr: 'komunikacja',
  potential_financial_gr: 'finanse',
};

export function usePriorityCrossSell() {
  return useQuery({
    queryKey: ['sgu-priority', 'cross-sell'],
    queryFn: async (): Promise<DashboardPriorityItem | null> => {
      // Klient standard z brakiem ≥1 obszaru (potential_*_gr = 0)
      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select(
          'id, contact_id, potential_property_gr, potential_life_group_gr, potential_communication_gr, potential_financial_gr, contact:contacts(full_name)'
        )
        .eq('client_status', 'standard')
        .or(
          'potential_property_gr.eq.0,potential_life_group_gr.eq.0,potential_communication_gr.eq.0,potential_financial_gr.eq.0'
        )
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const missing = Object.entries(AREA_LABELS)
        .filter(
          ([k]) =>
            (data as Record<string, number | null>)[k] === 0 ||
            (data as Record<string, number | null>)[k] == null
        )
        .map(([, label]) => label);

      const name =
        (data as { contact?: { full_name?: string | null } | null }).contact
          ?.full_name ?? `Klient ${data.contact_id?.slice(0, 8) ?? ''}`;

      return {
        kind: 'cross_sell',
        id: data.id,
        title: `Cross-sell: ${name}`,
        meta:
          missing.length > 0
            ? `Brak obszarów: ${missing.join(', ')}`
            : 'Brak obszarów',
        navigateTo: `/sgu/klienci?contact=${data.id}&tab=obszary`,
      };
    },
    staleTime: 60_000,
  });
}
