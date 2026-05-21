import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PoliciesListFilters {
  p_search?: string | null;
  p_insurer?: string | null;
  p_client_id?: string | null;
  p_date_from?: string | null;
  p_date_to?: string | null;
  p_limit?: number;
  p_offset?: number;
}

export interface PolicyListRow {
  policy_id: string;
  master_policy_number: string;
  client_company_id: string | null;
  client_name: string | null;
  insurer_name: string | null;
  product_name: string | null;
  entries_count: number;
  total_premium: number;
  total_commission: number;
  earliest_issue_date: string | null;
  latest_issue_date: string | null;
  latest_status: string | null;
}

export const useGetPoliciesList = (filters: PoliciesListFilters) =>
  useQuery<PolicyListRow[]>({
    queryKey: ['rozliczenia', 'policies', 'list', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_policies_list', {
        p_search: filters.p_search ?? undefined,
        p_insurer: filters.p_insurer ?? undefined,
        p_client_id: filters.p_client_id ?? undefined,
        p_date_from: filters.p_date_from ?? undefined,
        p_date_to: filters.p_date_to ?? undefined,
        p_limit: filters.p_limit ?? 50,
        p_offset: filters.p_offset ?? 0,
      });
      if (error) throw error;
      return (data ?? []) as PolicyListRow[];
    },
  });

export interface HoldingTreeNode {
  company_id: string;
  parent_company_id: string | null;
  depth: number;
  name: string;
  nip: string | null;
  total_policies: number;
  total_premium_ytd: number;
  total_commission_ytd: number;
}

export const useGetCompanyHolding = (companyId: string | undefined) =>
  useQuery<HoldingTreeNode[]>({
    queryKey: ['rozliczenia', 'company', companyId, 'holding'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_company_holding_tree', {
        p_root_company_id: companyId!,
      });
      if (error) throw error;
      return (data ?? []) as HoldingTreeNode[];
    },
    enabled: !!companyId,
  });

export interface UnmatchedClient {
  external_code: string;
  external_name: string | null;
  rows_count: number;
  latest_batch_id: string | null;
  latest_batch_created_at: string | null;
  earliest_seen_at: string | null;
}

export const useGetUnmatchedClients = () =>
  useQuery<UnmatchedClient[]>({
    queryKey: ['rozliczenia', 'unmatched-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unmatched_import_clients');
      if (error) throw error;
      return (data ?? []) as UnmatchedClient[];
    },
  });

export const useMatchImportClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { external_code: string; company_id: string; external_name_snapshot?: string | null }) => {
      const { data: mapData, error: mapErr } = await supabase.rpc('match_import_client', {
        p_external_code: args.external_code,
        p_company_id: args.company_id,
        p_external_name_snapshot: args.external_name_snapshot ?? undefined,
      });
      if (mapErr) throw mapErr;

      // Reprocess immediately
      const { data: reproc, error: reprocErr } = await supabase.functions.invoke('reprocess-unmatched-rows', {
        body: { external_code: args.external_code },
      });
      if (reprocErr) throw reprocErr;
      return { mapping: mapData, reprocess: reproc };
    },
    onSuccess: (res) => {
      const r = (res?.reprocess ?? {}) as { new_entries?: number; still_unmatched?: number };
      toast.success(`Dopasowano. Dodano ${r.new_entries ?? 0} pozycji.`);
      qc.invalidateQueries({ queryKey: ['rozliczenia'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Nie udało się dopasować klienta';
      toast.error(msg);
    },
  });
};

export interface PolicyEntry {
  id: string;
  insurance_policy_id: string;
  issue_date: string | null;
  start_date: string | null;
  end_date: string | null;
  cancelled_at: string | null;
  sale_type: string | null;
  premium_assigned: number | null;
  discount: number | null;
  payment_due: number | null;
  commission_pct: number | null;
  commission_gross: number | null;
  commission_net: number | null;
  first_installment_status: string | null;
  first_installment_date: string | null;
  first_installment_raw: string | null;
  product_name: string | null;
  subject_text: string | null;
  seller_raw: string | null;
  issuer_raw: string | null;
  from_offer: string | null;
}

export const usePolicyEntries = (policyId: string | undefined) =>
  useQuery<PolicyEntry[]>({
    queryKey: ['rozliczenia', 'policy', policyId, 'entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_entries')
        .select('*')
        .eq('insurance_policy_id', policyId!)
        .order('issue_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as PolicyEntry[];
    },
    enabled: !!policyId,
  });

export interface CompanyOption {
  id: string;
  name: string;
  nip: string | null;
}

export const useSearchCompanies = (q: string) =>
  useQuery<CompanyOption[]>({
    queryKey: ['rozliczenia', 'companies', 'search', q],
    queryFn: async () => {
      const term = q.trim();
      let query = supabase.from('companies').select('id, name, nip').order('name').limit(20);
      if (term) {
        query = query.or(`name.ilike.%${term}%,nip.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CompanyOption[];
    },
  });
