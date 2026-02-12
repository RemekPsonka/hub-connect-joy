import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ActualCommission {
  id: string;
  team_id: string;
  team_contact_id: string;
  client_product_id: string | null;
  tenant_id: string;
  month_date: string;
  actual_premium: number;
  actual_commission: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch actual commissions for a team and year */
export function useActualCommissions(teamId: string | undefined, year: number) {
  return useQuery({
    queryKey: ['actual-commissions', teamId, year],
    queryFn: async () => {
      if (!teamId) return [];
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const { data, error } = await (supabase as any)
        .from('deal_team_actual_commissions')
        .select('*')
        .eq('team_id', teamId)
        .gte('month_date', startDate)
        .lte('month_date', endDate)
        .order('month_date');
      if (error) throw error;
      return (data || []) as ActualCommission[];
    },
    enabled: !!teamId,
  });
}

/** Upsert an actual commission record */
export function useUpsertActualCommission() {
  const qc = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      teamId: string;
      teamContactId: string;
      clientProductId?: string | null;
      monthDate: string;
      actualPremium: number;
      actualCommission: number;
      notes?: string | null;
    }) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      const row = {
        team_id: input.teamId,
        team_contact_id: input.teamContactId,
        client_product_id: input.clientProductId || null,
        tenant_id: tenantId,
        month_date: input.monthDate,
        actual_premium: input.actualPremium,
        actual_commission: input.actualCommission,
        notes: input.notes || null,
      };

      if (input.id) {
        const { error } = await (supabase as any)
          .from('deal_team_actual_commissions')
          .update(row)
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('deal_team_actual_commissions')
          .upsert(row, { onConflict: 'team_contact_id,client_product_id,month_date' });
        if (error) throw error;
      }
      return { teamId: input.teamId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['actual-commissions', r.teamId] });
      toast.success('Prowizja zapisana');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
