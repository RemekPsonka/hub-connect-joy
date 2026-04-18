import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type KPIMetric = 'contacts_active' | 'contacts_new' | 'tasks_today' | 'prospects_new' | 'deals_revenue_mtd';
export type KPIRange = '7d' | '30d' | '90d' | 'mtd';

export interface KPIResult {
  value: number;
  label: string;
  metric: KPIMetric;
  range: KPIRange;
}

export function useWorkspaceKPI(metric: KPIMetric, range: KPIRange = '30d') {
  return useQuery({
    queryKey: ['workspace_kpi', metric, range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_workspace_kpi', { p_metric: metric, p_range: range });
      if (error) throw error;
      return data as unknown as KPIResult;
    },
    staleTime: 60_000,
  });
}
