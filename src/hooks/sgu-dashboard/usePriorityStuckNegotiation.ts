import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardPriorityItem } from '@/types/sgu-dashboard';

export function usePriorityStuckNegotiation() {
  return useQuery({
    queryKey: ['sgu-priority', 'stuck-negotiation'],
    queryFn: async (): Promise<DashboardPriorityItem | null> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 3);

      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select('id, contact_id, updated_at, contact:contacts(full_name)')
        .eq('deal_stage', 'offering')
        .eq('offering_stage', 'negotiation')
        .lt('updated_at', cutoff.toISOString())
        .order('updated_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const name =
        (data as { contact?: { full_name?: string | null } | null }).contact
          ?.full_name ?? `Kontakt ${data.contact_id?.slice(0, 8) ?? ''}`;
      const days = data.updated_at
        ? Math.floor(
            (Date.now() - new Date(data.updated_at).getTime()) / 86_400_000
          )
        : 0;
      return {
        kind: 'contact',
        id: data.id,
        title: `Negocjacje utknęły: ${name}`,
        meta: `Bez ruchu od ${days} dni`,
        navigateTo: `/sgu/sprzedaz?contact=${data.id}`,
      };
    },
    staleTime: 60_000,
  });
}
