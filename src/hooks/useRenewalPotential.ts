import { useMemo } from 'react';
import { isWithinInterval, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { useAllPolicies, PolicyWithCompany } from './useAllPolicies';
import type { PolicyType } from '@/components/renewal/types';

export type PeriodType = 'month' | 'quarter' | 'year';

export interface RenewalPotentialResult {
  foreignPoliciesInRange: PolicyWithCompany[];
  totalPotentialPremium: number;
  potentialByMonth: Record<string, number>;
  potentialByCategory: Record<PolicyType, number>;
  isLoading: boolean;
}

export function useRenewalPotential(
  year: number,
  period: PeriodType = 'year',
  periodIndex: number = 1 // 1-12 for month, 1-4 for quarter
): RenewalPotentialResult {
  const { policies, isLoading } = useAllPolicies();

  const dateRange = useMemo(() => {
    const baseDate = new Date(year, 0, 1);
    
    switch (period) {
      case 'month': {
        const monthDate = new Date(year, periodIndex - 1, 1);
        return {
          start: startOfMonth(monthDate),
          end: endOfMonth(monthDate),
        };
      }
      case 'quarter': {
        const quarterMonth = (periodIndex - 1) * 3;
        const quarterDate = new Date(year, quarterMonth, 1);
        return {
          start: startOfQuarter(quarterDate),
          end: endOfQuarter(quarterDate),
        };
      }
      case 'year':
      default:
        return {
          start: startOfYear(baseDate),
          end: endOfYear(baseDate),
        };
    }
  }, [year, period, periodIndex]);

  const foreignPoliciesInRange = useMemo(() => {
    if (!policies) return [];

    return policies.filter(p => {
      // Only foreign policies (not ours)
      if (p.is_our_policy) return false;

      const endDate = new Date(p.end_date);
      return isWithinInterval(endDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [policies, dateRange]);

  const totalPotentialPremium = useMemo(() => {
    return foreignPoliciesInRange.reduce((sum, p) => sum + (p.premium || 0), 0);
  }, [foreignPoliciesInRange]);

  const potentialByMonth = useMemo(() => {
    const result: Record<string, number> = {};

    foreignPoliciesInRange.forEach(p => {
      const endDate = new Date(p.end_date);
      const monthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!result[monthKey]) result[monthKey] = 0;
      result[monthKey] += p.premium || 0;
    });

    return result;
  }, [foreignPoliciesInRange]);

  const potentialByCategory = useMemo(() => {
    const result: Record<PolicyType, number> = {
      property: 0,
      fleet: 0,
      do: 0,
      cyber: 0,
      liability: 0,
      life: 0,
      health: 0,
      other: 0,
    };

    foreignPoliciesInRange.forEach(p => {
      const type = p.policy_type as PolicyType;
      if (result[type] !== undefined) {
        result[type] += p.premium || 0;
      }
    });

    return result;
  }, [foreignPoliciesInRange]);

  return {
    foreignPoliciesInRange,
    totalPotentialPremium,
    potentialByMonth,
    potentialByCategory,
    isLoading,
  };
}
