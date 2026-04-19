import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProspectingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  payload: Record<string, unknown> | null;
  result: { candidates_added?: number; next_offset?: number; errors?: unknown[] } | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

/** Poll one specific job. */
export function useProspectingJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['sgu-prospecting-job', jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<ProspectingJob | null> => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from('background_jobs')
        .select('id, status, progress, payload, result, error, created_at, finished_at')
        .eq('id', jobId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ProspectingJob | null;
    },
    refetchInterval: (q) => {
      const s = (q.state.data as ProspectingJob | null)?.status;
      return s === 'pending' || s === 'processing' ? 5000 : false;
    },
  });
}

/** List recent prospecting jobs for the current user/tenant. */
export function useProspectingJobs(limit = 10) {
  return useQuery({
    queryKey: ['sgu-prospecting-jobs', limit],
    queryFn: async (): Promise<ProspectingJob[]> => {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('id, status, progress, payload, result, error, created_at, finished_at')
        .eq('job_type', 'sgu_krs_prospecting')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as ProspectingJob[];
    },
    refetchInterval: 10_000,
  });
}
