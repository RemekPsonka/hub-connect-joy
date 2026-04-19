import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SGUReportSnapshot, SnapshotData } from '@/types/sgu-report-snapshot';

/**
 * Pojedynczy snapshot po id — wykorzystuje rpc_sgu_get_snapshot
 * (SECURITY INVOKER, RLS-aware).
 */
export function useSnapshotPreview(snapshotId: string | null) {
  return useQuery({
    queryKey: ['sgu-snapshot', snapshotId],
    enabled: !!snapshotId,
    queryFn: async (): Promise<SGUReportSnapshot | null> => {
      if (!snapshotId) return null;
      const { data, error } = await supabase.rpc('rpc_sgu_get_snapshot', { p_id: snapshotId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        ...row,
        data: row.data as unknown as SnapshotData,
      } as SGUReportSnapshot;
    },
    staleTime: 5 * 60 * 1000,
  });
}
