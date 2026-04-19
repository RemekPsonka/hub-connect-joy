import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';

export interface SGUProspect {
  id: string;
  category: string | null;
  status: string | null;
  source_contact_id: string | null;
  contact_id: string;
  expected_annual_premium_gr: number | null;
  notes: string | null;
  created_at: string;
  contact: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    source: string | null;
  } | null;
}

export interface SGUProspectFilters {
  search?: string;
  status?: string;
  showArchived?: boolean;
}

export function useSGUProspects(filters: SGUProspectFilters = {}) {
  const { sguTeamId } = useSGUTeamId();

  return useQuery({
    queryKey: ['sgu-prospects', sguTeamId, filters],
    queryFn: async () => {
      if (!sguTeamId) return [] as SGUProspect[];
      let q = supabase
        .from('deal_team_contacts')
        .select(
          'id, category, status, source_contact_id, contact_id, expected_annual_premium_gr, notes, created_at, contact:contacts!deal_team_contacts_contact_id_fkey(id, full_name, phone, email, source)',
        )
        .eq('team_id', sguTeamId)
        .in('category', ['lead', 'prospect'])
        .order('created_at', { ascending: false });

      if (!filters.showArchived) {
        q = q.neq('status', 'inactive');
      }
      if (filters.status) {
        q = q.eq('status', filters.status);
      }

      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as unknown as SGUProspect[];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        rows = rows.filter((r) =>
          (r.contact?.full_name ?? '').toLowerCase().includes(s) ||
          (r.contact?.phone ?? '').toLowerCase().includes(s) ||
          (r.contact?.email ?? '').toLowerCase().includes(s),
        );
      }
      return rows;
    },
    enabled: !!sguTeamId,
    staleTime: 30_000,
  });
}
