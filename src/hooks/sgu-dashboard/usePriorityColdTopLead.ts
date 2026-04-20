import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardPriorityItem } from '@/types/sgu-dashboard';

export function usePriorityColdTopLead() {
  return useQuery({
    queryKey: ['sgu-priority', 'cold-top-lead'],
    queryFn: async (): Promise<DashboardPriorityItem | null> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);

      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select(
          'id, contact_id, last_status_update, contact:contacts!deal_team_contacts_contact_id_fkey(full_name)'
        )
        .eq('temperature', 'top')
        .or(
          `last_status_update.is.null,last_status_update.lt.${cutoff.toISOString()}`
        )
        .order('last_status_update', { ascending: true, nullsFirst: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const name =
        (data as { contact?: { full_name?: string | null } | null }).contact
          ?.full_name ?? `Kontakt ${data.contact_id?.slice(0, 8) ?? ''}`;
      const meta = data.last_status_update
        ? `Ostatni kontakt: ${new Date(data.last_status_update).toLocaleDateString('pl-PL')}`
        : 'Brak kontaktu';
      return {
        kind: 'contact',
        id: data.id,
        title: `Wystygły TOP lead: ${name}`,
        meta,
        navigateTo: `/sgu/sprzedaz?contactId=${data.id}`,
      };
    },
    staleTime: 60_000,
  });
}
