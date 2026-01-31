import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PolicyType } from '@/components/renewal/types';

export type ProductionStatus = 'pending' | 'invoiced' | 'paid';

export interface ProductionRecord {
  id: string;
  tenant_id: string;
  policy_id: string | null;
  company_id: string | null;
  production_year: number;
  production_month: number;
  product_id: string | null;
  product_category: string | null;
  forecasted_premium: number;
  actual_premium: number;
  commission_rate: number | null;
  forecasted_commission: number;
  actual_commission: number;
  status: ProductionStatus;
  invoice_date: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    name: string;
    short_name: string | null;
  } | null;
  policy?: {
    id: string;
    policy_name: string;
    policy_number: string | null;
  } | null;
}

interface CreateRecordInput {
  policy_id?: string | null;
  company_id?: string | null;
  production_year: number;
  production_month: number;
  product_id?: string | null;
  product_category?: string | null;
  forecasted_premium?: number;
  actual_premium?: number;
  commission_rate?: number | null;
  forecasted_commission?: number;
  actual_commission?: number;
  status?: ProductionStatus;
  invoice_date?: string | null;
  payment_date?: string | null;
  notes?: string | null;
}

interface UpdateRecordInput extends Partial<CreateRecordInput> {
  id: string;
}

export function useProductionRecords(year: number, month?: number) {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  const { data: records, isLoading, error } = useQuery({
    queryKey: ['production-records', tenantId, year, month],
    queryFn: async () => {
      let query = supabase
        .from('policy_production_records')
        .select(`
          *,
          company:companies(id, name, short_name),
          policy:insurance_policies(id, policy_name, policy_number)
        `)
        .eq('production_year', year)
        .order('production_month', { ascending: true });

      if (month) {
        query = query.eq('production_month', month);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProductionRecord[];
    },
    enabled: !!tenantId,
  });

  const aggregates = useMemo(() => {
    if (!records) {
      return {
        totalForecastedPremium: 0,
        totalActualPremium: 0,
        totalForecastedCommission: 0,
        totalActualCommission: 0,
      };
    }

    return records.reduce(
      (acc, r) => ({
        totalForecastedPremium: acc.totalForecastedPremium + (r.forecasted_premium || 0),
        totalActualPremium: acc.totalActualPremium + (r.actual_premium || 0),
        totalForecastedCommission: acc.totalForecastedCommission + (r.forecasted_commission || 0),
        totalActualCommission: acc.totalActualCommission + (r.actual_commission || 0),
      }),
      {
        totalForecastedPremium: 0,
        totalActualPremium: 0,
        totalForecastedCommission: 0,
        totalActualCommission: 0,
      }
    );
  }, [records]);

  const byMonth = useMemo(() => {
    if (!records) return {};
    return records.reduce<Record<number, ProductionRecord[]>>((acc, r) => {
      const m = r.production_month;
      if (!acc[m]) acc[m] = [];
      acc[m].push(r);
      return acc;
    }, {});
  }, [records]);

  const byCategory = useMemo(() => {
    if (!records) return {};
    return records.reduce<Record<string, { premium: number; commission: number; count: number }>>((acc, r) => {
      const cat = r.product_category || 'other';
      if (!acc[cat]) acc[cat] = { premium: 0, commission: 0, count: 0 };
      acc[cat].premium += r.actual_premium || 0;
      acc[cat].commission += r.actual_commission || 0;
      acc[cat].count++;
      return acc;
    }, {});
  }, [records]);

  const monthlyTotals = useMemo(() => {
    const totals: Array<{
      month: number;
      forecastedPremium: number;
      actualPremium: number;
      forecastedCommission: number;
      actualCommission: number;
    }> = [];

    for (let m = 1; m <= 12; m++) {
      const monthRecords = byMonth[m] || [];
      totals.push({
        month: m,
        forecastedPremium: monthRecords.reduce((sum, r) => sum + (r.forecasted_premium || 0), 0),
        actualPremium: monthRecords.reduce((sum, r) => sum + (r.actual_premium || 0), 0),
        forecastedCommission: monthRecords.reduce((sum, r) => sum + (r.forecasted_commission || 0), 0),
        actualCommission: monthRecords.reduce((sum, r) => sum + (r.actual_commission || 0), 0),
      });
    }

    return totals;
  }, [byMonth]);

  const createRecord = useMutation({
    mutationFn: async (input: CreateRecordInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('policy_production_records')
        .insert({
          ...input,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-records'] });
      toast.success('Rekord produkcji został dodany');
    },
    onError: (error) => {
      console.error('Error creating production record:', error);
      toast.error('Nie udało się dodać rekordu produkcji');
    },
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id, ...input }: UpdateRecordInput) => {
      const { data, error } = await supabase
        .from('policy_production_records')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-records'] });
      toast.success('Rekord produkcji został zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating production record:', error);
      toast.error('Nie udało się zaktualizować rekordu');
    },
  });

  const deleteRecord = useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from('policy_production_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-records'] });
      toast.success('Rekord produkcji został usunięty');
    },
    onError: (error) => {
      console.error('Error deleting production record:', error);
      toast.error('Nie udało się usunąć rekordu');
    },
  });

  return {
    records: records || [],
    isLoading,
    error,
    ...aggregates,
    byMonth,
    byCategory,
    monthlyTotals,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
