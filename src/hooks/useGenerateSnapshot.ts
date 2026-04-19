import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { SGUPeriodType } from '@/types/sgu-report-snapshot';

interface GenerateSnapshotInput {
  period_type: SGUPeriodType;
  period_start: string; // YYYY-MM-DD
  period_end?: string | null;
}

interface GenerateSnapshotResult {
  snapshot_id: string;
}

/**
 * Wywołuje rpc_sgu_generate_snapshot — zapisuje (lub aktualizuje) snapshot
 * dla bieżącego tenanta i SGU teamu z generated_by='manual'.
 */
export function useGenerateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateSnapshotInput): Promise<GenerateSnapshotResult> => {
      const { data, error } = await supabase.rpc('rpc_sgu_generate_snapshot', {
        p_period_type: input.period_type,
        p_period_start: input.period_start,
        p_period_end: input.period_end ?? undefined,
      });
      if (error) throw error;
      const payload = (data ?? {}) as Record<string, unknown>;
      const snapshotId =
        typeof payload.snapshot_id === 'string'
          ? payload.snapshot_id
          : typeof payload.id === 'string'
            ? (payload.id as string)
            : '';
      return { snapshot_id: snapshotId };
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['sgu-reports', vars.period_type] });
      toast.success('Raport wygenerowany');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Nie udało się wygenerować raportu';
      toast.error(msg);
    },
  });
}
