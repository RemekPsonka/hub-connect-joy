import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { InsurancePolicy, RenewalChecklist, PolicyType } from '@/components/renewal/types';
import type { Json } from '@/integrations/supabase/types';

interface CreatePolicyInput {
  company_id: string;
  policy_type: PolicyType;
  policy_name: string;
  policy_number?: string;
  insurer_name?: string;
  broker_name?: string;
  start_date: string;
  end_date: string;
  sum_insured?: number;
  premium?: number;
  notes?: string;
  is_our_policy?: boolean;
}

interface UpdatePolicyInput extends Partial<CreatePolicyInput> {
  id: string;
}

const DEFAULT_CHECKLIST: RenewalChecklist = {
  data_update_requested: false,
  market_tender_done: false,
  negotiation_completed: false,
  board_approval_obtained: false,
};

function isChecklistComplete(checklist: RenewalChecklist): boolean {
  return (
    checklist.data_update_requested &&
    checklist.market_tender_done &&
    checklist.negotiation_completed &&
    checklist.board_approval_obtained
  );
}

function hasChecklistStarted(checklist: RenewalChecklist): boolean {
  return (
    checklist.data_update_requested ||
    checklist.market_tender_done ||
    checklist.negotiation_completed ||
    checklist.board_approval_obtained
  );
}

export function useInsurancePolicies(companyId: string) {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  const { data: policies, isLoading, error } = useQuery({
    queryKey: ['insurance-policies', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('company_id', companyId)
        .order('end_date', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(p => {
        const checklist = p.renewal_checklist as Record<string, boolean> | null;
        return {
          ...p,
          renewal_checklist: {
            data_update_requested: checklist?.data_update_requested ?? false,
            market_tender_done: checklist?.market_tender_done ?? false,
            negotiation_completed: checklist?.negotiation_completed ?? false,
            board_approval_obtained: checklist?.board_approval_obtained ?? false,
          },
        } as InsurancePolicy;
      });
    },
    enabled: !!companyId && !!tenantId,
  });

  const createPolicy = useMutation({
    mutationFn: async (input: CreatePolicyInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase
        .from('insurance_policies')
        .insert({
          ...input,
          tenant_id: tenantId,
          renewal_checklist: DEFAULT_CHECKLIST as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-policies', companyId] });
      toast.success('Polisa została dodana');
    },
    onError: (error) => {
      console.error('Error creating policy:', error);
      toast.error('Nie udało się dodać polisy');
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ id, ...input }: UpdatePolicyInput) => {
      const { data, error } = await supabase
        .from('insurance_policies')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-policies', companyId] });
      toast.success('Polisa została zaktualizowana');
    },
    onError: (error) => {
      console.error('Error updating policy:', error);
      toast.error('Nie udało się zaktualizować polisy');
    },
  });

  const updateChecklist = useMutation({
    mutationFn: async ({ 
      policyId, 
      checklist 
    }: { 
      policyId: string; 
      checklist: RenewalChecklist 
    }) => {
      const { data, error } = await supabase
        .from('insurance_policies')
        .update({ renewal_checklist: checklist as unknown as Json })
        .eq('id', policyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-policies', companyId] });
    },
    onError: (error) => {
      console.error('Error updating checklist:', error);
      toast.error('Nie udało się zaktualizować checklisty');
    },
  });

  const deletePolicy = useMutation({
    mutationFn: async (policyId: string) => {
      const { error } = await supabase
        .from('insurance_policies')
        .delete()
        .eq('id', policyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-policies', companyId] });
      toast.success('Polisa została usunięta');
    },
    onError: (error) => {
      console.error('Error deleting policy:', error);
      toast.error('Nie udało się usunąć polisy');
    },
  });

  const criticalPolicies = useMemo(() => {
    if (!policies) return [];
    const today = new Date();

    return policies.filter(p => {
      const endDate = new Date(p.end_date);
      const daysLeft = differenceInDays(endDate, today);
      const checklist = p.renewal_checklist;

      // Critical if:
      // 1. Expired
      // 2. In danger zone (<30 days) without complete checklist
      // 3. In action phase (<90 days) with no started items
      return (
        daysLeft < 0 ||
        (daysLeft <= 30 && !isChecklistComplete(checklist)) ||
        (daysLeft <= 90 && !hasChecklistStarted(checklist))
      );
    });
  }, [policies]);

  return {
    policies: policies || [],
    isLoading,
    error,
    createPolicy,
    updatePolicy,
    updateChecklist,
    deletePolicy,
    criticalPolicies,
    isChecklistComplete,
    hasChecklistStarted,
  };
}
