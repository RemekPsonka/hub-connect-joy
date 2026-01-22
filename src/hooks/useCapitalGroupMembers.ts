import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CapitalGroupMember {
  id: string;
  tenant_id: string;
  parent_company_id: string;
  member_company_id: string | null;
  external_name: string;
  external_krs: string | null;
  external_nip: string | null;
  external_regon: string | null;
  relationship_type: 'parent' | 'subsidiary' | 'affiliate' | 'branch';
  ownership_percent: number | null;
  revenue_amount: number | null;
  revenue_year: number | null;
  data_source: string | null;
  krs_verified: boolean;
  created_at: string;
  updated_at: string;
  member_company?: {
    id: string;
    name: string;
    logo_url: string | null;
    revenue_amount: number | null;
    revenue_year: number | null;
  } | null;
}

export function useCapitalGroupMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['capital-group-members', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // First get the members
      const { data: members, error } = await supabase
        .from('capital_group_members')
        .select('*')
        .eq('parent_company_id', companyId)
        .order('relationship_type')
        .order('external_name');
      
      if (error) throw error;
      if (!members?.length) return [];
      
      // Get linked companies separately
      const linkedCompanyIds = members
        .filter(m => m.member_company_id)
        .map(m => m.member_company_id);
      
      let companiesMap: Record<string, { id: string; name: string; logo_url: string | null; revenue_amount: number | null; revenue_year: number | null }> = {};
      
      if (linkedCompanyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, logo_url, revenue_amount, revenue_year')
          .in('id', linkedCompanyIds);
        
        if (companies) {
          companiesMap = Object.fromEntries(companies.map(c => [c.id, c]));
        }
      }
      
      // Merge the data
      return members.map(m => ({
        ...m,
        member_company: m.member_company_id ? companiesMap[m.member_company_id] || null : null
      })) as CapitalGroupMember[];
    },
    enabled: !!companyId
  });
}

export interface AddCapitalGroupMemberInput {
  parent_company_id: string;
  external_name: string;
  external_nip?: string | null;
  external_krs?: string | null;
  external_regon?: string | null;
  relationship_type: 'parent' | 'subsidiary' | 'affiliate' | 'branch';
  ownership_percent?: number | null;
  revenue_amount?: number | null;
  revenue_year?: number | null;
  data_source?: string;
}

export function useAddCapitalGroupMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: AddCapitalGroupMemberInput) => {
      // Get tenant_id from current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nie jesteś zalogowany');
      
      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (!director) throw new Error('Nie znaleziono dyrektora');
      
      // Check if company with NIP/KRS exists in database
      let member_company_id = null;
      if (input.external_nip || input.external_krs) {
        const query = supabase
          .from('companies')
          .select('id')
          .eq('tenant_id', director.tenant_id);
        
        if (input.external_nip) {
          query.eq('nip', input.external_nip);
        } else if (input.external_krs) {
          query.eq('krs', input.external_krs);
        }
        
        const { data: existingCompany } = await query.maybeSingle();
        member_company_id = existingCompany?.id || null;
      }
      
      const { data, error } = await supabase
        .from('capital_group_members')
        .insert({
          ...input,
          tenant_id: director.tenant_id,
          member_company_id,
          data_source: input.data_source || 'manual'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capital-group-members', variables.parent_company_id] });
      toast.success('Dodano spółkę do grupy kapitałowej');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    }
  });
}

export function useRemoveCapitalGroupMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ memberId, parentCompanyId }: { memberId: string; parentCompanyId: string }) => {
      const { error } = await supabase
        .from('capital_group_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      return { memberId, parentCompanyId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['capital-group-members', result.parentCompanyId] });
      toast.success('Usunięto spółkę z grupy kapitałowej');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    }
  });
}

export function useLinkMemberToCompany() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ memberId, companyId, parentCompanyId }: { memberId: string; companyId: string; parentCompanyId: string }) => {
      const { error } = await supabase
        .from('capital_group_members')
        .update({ member_company_id: companyId })
        .eq('id', memberId);
      
      if (error) throw error;
      return { memberId, parentCompanyId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['capital-group-members', result.parentCompanyId] });
      toast.success('Powiązano ze spółką w bazie');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    }
  });
}
