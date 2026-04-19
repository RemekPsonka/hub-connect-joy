import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  SGUPeriodType,
  SGUReportSnapshot,
  SnapshotData,
} from '@/types/sgu-report-snapshot';

/**
 * Lista snapshotów raportów SGU dla wybranego typu okresu.
 * RLS na sgu_reports_snapshots filtruje per tenant + role
 * (partner / director / superadmin; rep dostaje pusty wynik).
 */
export function useSGUReports(periodType: SGUPeriodType) {
  return useQuery({
    queryKey: ['sgu-reports', periodType],
    queryFn: async (): Promise<SGUReportSnapshot[]> => {
      const { data, error } = await supabase
        .from('sgu_reports_snapshots')
        .select(
          'id, tenant_id, team_id, period_type, period_start, period_end, data, generated_at, generated_by, generated_by_user_id',
        )
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        data: row.data as unknown as SnapshotData,
      })) as SGUReportSnapshot[];
    },
    staleTime: 60 * 1000,
  });
}
