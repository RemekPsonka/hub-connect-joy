import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CommissionPeriod = 'thisMonth' | 'lastMonth' | 'quarter' | 'ytd' | 'all';
export type CommissionPayoutFilter = 'pending' | 'paid' | 'all';

export interface CommissionEntryRow {
  id: string;
  tenant_id: string;
  team_id: string;
  insurance_policy_id: string;
  payment_schedule_id: string | null;
  deal_team_contact_id: string | null;
  recipient_type: string;
  recipient_user_id: string | null;
  recipient_label: string;
  role_key: string | null;
  share_pct: number;
  amount_gr: number;
  base_commission_gr: number;
  modifiers_applied: unknown;
  calculation_log: unknown;
  paid_out: boolean;
  paid_out_at: string | null;
  paid_out_by_user_id: string | null;
  created_at: string;
  // joined
  policy_name?: string | null;
  policy_number?: string | null;
  client_label?: string | null;
}

export interface CommissionEntriesFilters {
  teamId: string;
  recipientUserId?: string | null;
  roleKey?: string | null;
  period?: CommissionPeriod;
  payout?: CommissionPayoutFilter;
}

function periodToRange(p: CommissionPeriod): { from: string | null; to: string | null } {
  const now = new Date();
  const startOfMonth = (year: number, month: number) =>
    new Date(Date.UTC(year, month, 1)).toISOString();

  if (p === 'thisMonth') {
    return {
      from: startOfMonth(now.getUTCFullYear(), now.getUTCMonth()),
      to: null,
    };
  }
  if (p === 'lastMonth') {
    return {
      from: startOfMonth(now.getUTCFullYear(), now.getUTCMonth() - 1),
      to: startOfMonth(now.getUTCFullYear(), now.getUTCMonth()),
    };
  }
  if (p === 'quarter') {
    const q = Math.floor(now.getUTCMonth() / 3);
    return {
      from: startOfMonth(now.getUTCFullYear(), q * 3),
      to: null,
    };
  }
  if (p === 'ytd') {
    return {
      from: startOfMonth(now.getUTCFullYear(), 0),
      to: null,
    };
  }
  return { from: null, to: null };
}

export function useCommissionEntries(filters: CommissionEntriesFilters) {
  return useQuery<CommissionEntryRow[]>({
    queryKey: ['sgu-commission-entries', filters],
    queryFn: async () => {
      let q = supabase
        .from('commission_entries')
        .select(`
          *,
          insurance_policies:insurance_policy_id (policy_name, policy_number),
          deal_team_contacts:deal_team_contact_id (
            contact:contact_id (full_name, company)
          )
        `)
        .eq('team_id', filters.teamId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.recipientUserId) {
        q = q.eq('recipient_user_id', filters.recipientUserId);
      }
      if (filters.roleKey) {
        q = q.eq('role_key', filters.roleKey);
      }
      if (filters.payout === 'pending') q = q.eq('paid_out', false);
      if (filters.payout === 'paid') q = q.eq('paid_out', true);

      const { from, to } = periodToRange(filters.period ?? 'thisMonth');
      if (from) q = q.gte('created_at', from);
      if (to) q = q.lt('created_at', to);

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((row) => {
        const r = row as unknown as Record<string, unknown> & {
          insurance_policies?: { policy_name?: string | null; policy_number?: string | null } | null;
          deal_team_contacts?: { contact?: { full_name?: string | null; company?: string | null } | null } | null;
        };
        const contact = r.deal_team_contacts?.contact;
        const clientLabel = contact?.full_name ?? contact?.company ?? null;
        return {
          ...(r as unknown as CommissionEntryRow),
          policy_name: r.insurance_policies?.policy_name ?? null,
          policy_number: r.insurance_policies?.policy_number ?? null,
          client_label: clientLabel,
        };
      });
    },
    enabled: !!filters.teamId,
    staleTime: 30_000,
  });
}

export function useMarkCommissionPaidOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      const { data, error } = await supabase.rpc('rpc_mark_commission_paid_out', {
        p_entry_ids: entryIds,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(`Oznaczono jako wypłacone: ${count}`);
      qc.invalidateQueries({ queryKey: ['sgu-commission-entries'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
