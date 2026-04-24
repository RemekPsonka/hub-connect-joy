import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DealCategory } from '@/types/dealTeam';

export interface LostClientRow {
  id: string;
  contact_id: string;
  contact_name: string;
  company: string | null;
  lost_reason: string | null;
  lost_at: string | null;
  category: DealCategory;
  offering_stage: string | null;
}

export function useLostClients(teamId: string | null) {
  return useQuery({
    queryKey: ['lost-clients', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<LostClientRow[]> => {
      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select(
          'id, contact_id, lost_reason, lost_at, category, offering_stage, contacts:contact_id (full_name, company)',
        )
        .eq('team_id', teamId!)
        .or('is_lost.eq.true,status.eq.lost,category.eq.lost')
        .order('lost_at', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => {
        const contact = row.contacts as { full_name?: string; company?: string | null } | null;
        return {
          id: row.id as string,
          contact_id: row.contact_id as string,
          contact_name: contact?.full_name ?? '—',
          company: contact?.company ?? null,
          lost_reason: (row.lost_reason as string | null) ?? null,
          lost_at: (row.lost_at as string | null) ?? null,
          category: row.category as DealCategory,
          offering_stage: (row.offering_stage as string | null) ?? null,
        };
      });
    },
    staleTime: 60 * 1000,
  });
}

export interface RestoreFromLostInput {
  id: string;
  teamId: string;
  category: DealCategory;
}

export function useRestoreFromLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, category }: RestoreFromLostInput) => {
      const updates: Record<string, unknown> = {
        is_lost: false,
        lost_reason: null,
        lost_at: null,
        status: 'active',
        category,
        last_status_update: new Date().toISOString(),
      };
      // If restoring outside offering, clear offering_stage to avoid stale 'lost'
      if (category !== 'offering') {
        updates.offering_stage = null;
      } else {
        updates.offering_stage = 'decision_meeting';
      }
      const { error } = await supabase.from('deal_team_contacts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['lost-clients', vars.teamId] });
      qc.invalidateQueries({ queryKey: ['deal-team-contacts', vars.teamId] });
      qc.invalidateQueries({ queryKey: ['unified-kanban-data'] });
      qc.invalidateQueries({ queryKey: ['sgu-funnel'] });
    },
  });
}