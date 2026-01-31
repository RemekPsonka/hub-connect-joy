import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { differenceInDays, format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PolicyType, RenewalChecklist } from '@/components/renewal/types';

export interface PolicyWithCompany {
  id: string;
  company_id: string;
  tenant_id: string;
  policy_type: PolicyType;
  policy_number?: string | null;
  policy_name: string;
  insurer_name?: string | null;
  broker_name?: string | null;
  start_date: string;
  end_date: string;
  renewal_checklist: RenewalChecklist;
  sum_insured?: number | null;
  premium?: number | null;
  notes?: string | null;
  is_our_policy?: boolean;
  workflow_status?: string;
  moved_to_finalization_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  company: {
    id: string;
    name: string;
    short_name?: string | null;
    logo_url?: string | null;
  } | null;
}

export type PolicyPhase = 'active' | 'preparation' | 'finalization' | 'expired';

export interface PipelineStats {
  backlog: PolicyWithCompany[];
  preparation: PolicyWithCompany[];
  finalization: PolicyWithCompany[];
  expired: PolicyWithCompany[];
  ourPolicies: PolicyWithCompany[];
  foreignPolicies: PolicyWithCompany[];
  ourPremium: number;
  foreignPremium: number;
  totalPolicies: number;
  byType: Record<PolicyType, { count: number; premium: number }>;
  byMonth: Array<{
    month: string;
    monthLabel: string;
    policies: PolicyWithCompany[];
    totalPremium: number;
  }>;
}

export function getPolicyPhase(policy: PolicyWithCompany): PolicyPhase {
  const today = new Date();
  const endDate = new Date(policy.end_date);
  const daysLeft = differenceInDays(endDate, today);

  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'finalization';
  if (daysLeft <= 120) return 'preparation';
  return 'active';
}

export function getDaysUntilExpiry(policy: PolicyWithCompany): number {
  return differenceInDays(new Date(policy.end_date), new Date());
}

function groupByType(policies: PolicyWithCompany[]): Record<PolicyType, { count: number; premium: number }> {
  const result: Record<PolicyType, { count: number; premium: number }> = {
    property: { count: 0, premium: 0 },
    fleet: { count: 0, premium: 0 },
    do: { count: 0, premium: 0 },
    cyber: { count: 0, premium: 0 },
    liability: { count: 0, premium: 0 },
    life: { count: 0, premium: 0 },
    health: { count: 0, premium: 0 },
    other: { count: 0, premium: 0 },
  };

  policies.forEach(p => {
    const type = p.policy_type as PolicyType;
    if (result[type]) {
      result[type].count++;
      result[type].premium += p.premium || 0;
    }
  });

  return result;
}

function groupByExpiryMonth(policies: PolicyWithCompany[]): PipelineStats['byMonth'] {
  const grouped = new Map<string, PolicyWithCompany[]>();

  policies.forEach(p => {
    const month = format(new Date(p.end_date), 'yyyy-MM');
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(p);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, monthPolicies]) => ({
      month,
      monthLabel: format(new Date(month + '-01'), 'LLLL yyyy', { locale: pl }),
      policies: monthPolicies,
      totalPremium: monthPolicies.reduce((sum, p) => sum + (p.premium || 0), 0),
    }));
}

export function useAllPolicies() {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  const { data: policies, isLoading, error } = useQuery({
    queryKey: ['all-policies', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select(`
          *,
          company:companies(id, name, short_name, logo_url)
        `)
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
        } as PolicyWithCompany;
      });
    },
    enabled: !!tenantId,
  });

  const stats = useMemo<PipelineStats | null>(() => {
    if (!policies) return null;

    const today = new Date();
    const backlog: PolicyWithCompany[] = [];
    const preparation: PolicyWithCompany[] = [];
    const finalization: PolicyWithCompany[] = [];
    const expired: PolicyWithCompany[] = [];

    policies.forEach(p => {
      const phase = getPolicyPhase(p);
      switch (phase) {
        case 'expired':
          expired.push(p);
          break;
        case 'finalization':
          finalization.push(p);
          break;
        case 'preparation':
          preparation.push(p);
          break;
        default:
          backlog.push(p);
      }
    });

    const ourPolicies = policies.filter(p => p.is_our_policy);
    const foreignPolicies = policies.filter(p => !p.is_our_policy);

    const ourPremium = ourPolicies.reduce((sum, p) => sum + (p.premium || 0), 0);
    const foreignPremium = foreignPolicies.reduce((sum, p) => sum + (p.premium || 0), 0);

    return {
      backlog,
      preparation,
      finalization,
      expired,
      ourPolicies,
      foreignPolicies,
      ourPremium,
      foreignPremium,
      totalPolicies: policies.length,
      byType: groupByType(policies),
      byMonth: groupByExpiryMonth(policies),
    };
  }, [policies]);

  const toggleOurPolicy = useMutation({
    mutationFn: async ({ policyId, isOurs }: { policyId: string; isOurs: boolean }) => {
      const { error } = await supabase
        .from('insurance_policies')
        .update({ is_our_policy: isOurs })
        .eq('id', policyId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-policies'] });
      toast.success(variables.isOurs ? 'Oznaczono jako nasza polisa' : 'Oznaczono jako obca polisa');
    },
    onError: (error) => {
      console.error('Error toggling policy:', error);
      toast.error('Nie udało się zaktualizować polisy');
    },
  });

  const updateWorkflowStatus = useMutation({
    mutationFn: async ({ policyId, status }: { policyId: string; status: string }) => {
      const updates: Record<string, unknown> = { workflow_status: status };
      
      if (status === 'finalization') {
        updates.moved_to_finalization_at = new Date().toISOString();
      }
      if (status === 'completed' || status === 'lost') {
        updates.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('insurance_policies')
        .update(updates)
        .eq('id', policyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-policies'] });
    },
    onError: (error) => {
      console.error('Error updating workflow status:', error);
      toast.error('Nie udało się zaktualizować statusu');
    },
  });

  return {
    policies: policies || [],
    stats,
    isLoading,
    error,
    toggleOurPolicy,
    updateWorkflowStatus,
  };
}
