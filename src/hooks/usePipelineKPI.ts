import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PipelineKPITarget {
  id: string;
  tenant_id: string;
  year: number;
  month: number | null;
  target_premium: number;
  target_commission: number | null;
  target_commission_rate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateKPIInput {
  year: number;
  month?: number | null;
  target_premium: number;
  target_commission?: number | null;
  target_commission_rate?: number | null;
  notes?: string | null;
}

interface UpdateKPIInput extends Partial<CreateKPIInput> {
  id: string;
}

export function usePipelineKPI(year: number) {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  const { data: targets, isLoading, error } = useQuery({
    queryKey: ['pipeline-kpi', tenantId, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_kpi_targets')
        .select('*')
        .eq('year', year)
        .order('month', { ascending: true, nullsFirst: true });

      if (error) throw error;
      return (data || []) as PipelineKPITarget[];
    },
    enabled: !!tenantId,
  });

  const yearlyTarget = targets?.find(t => t.month === null) || null;
  const monthlyTargets = targets?.filter(t => t.month !== null) || [];

  const createTarget = useMutation({
    mutationFn: async (input: CreateKPIInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('pipeline_kpi_targets')
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
      queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] });
      toast.success('Cel KPI został zapisany');
    },
    onError: (error) => {
      console.error('Error creating KPI target:', error);
      toast.error('Nie udało się zapisać celu KPI');
    },
  });

  const updateTarget = useMutation({
    mutationFn: async ({ id, ...input }: UpdateKPIInput) => {
      const { data, error } = await supabase
        .from('pipeline_kpi_targets')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] });
      toast.success('Cel KPI został zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating KPI target:', error);
      toast.error('Nie udało się zaktualizować celu KPI');
    },
  });

  const deleteTarget = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase
        .from('pipeline_kpi_targets')
        .delete()
        .eq('id', targetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] });
      toast.success('Cel KPI został usunięty');
    },
    onError: (error) => {
      console.error('Error deleting KPI target:', error);
      toast.error('Nie udało się usunąć celu KPI');
    },
  });

  const upsertYearlyTarget = useMutation({
    mutationFn: async (input: Omit<CreateKPIInput, 'year' | 'month'>) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('pipeline_kpi_targets')
        .upsert(
          {
            tenant_id: tenantId,
            year,
            month: null,
            ...input,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,year,month' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] });
      toast.success('Cel roczny został zapisany');
    },
    onError: (error) => {
      console.error('Error upserting yearly target:', error);
      toast.error('Nie udało się zapisać celu rocznego');
    },
  });

  const upsertMonthlyTarget = useMutation({
    mutationFn: async ({ month, ...input }: { month: number } & Omit<CreateKPIInput, 'year' | 'month'>) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('pipeline_kpi_targets')
        .upsert(
          {
            tenant_id: tenantId,
            year,
            month,
            ...input,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,year,month' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] });
    },
    onError: (error) => {
      console.error('Error upserting monthly target:', error);
      toast.error('Nie udało się zapisać celu miesięcznego');
    },
  });

  return {
    targets: targets || [],
    yearlyTarget,
    monthlyTargets,
    isLoading,
    error,
    createTarget,
    updateTarget,
    deleteTarget,
    upsertYearlyTarget,
    upsertMonthlyTarget,
  };
}
