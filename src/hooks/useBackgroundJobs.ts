import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BackgroundJob {
  id: string;
  tenant_id: string;
  actor_id: string;
  job_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Returns recent + active background jobs for the current tenant. */
export function useMyJobs(limit = 20) {
  return useQuery({
    queryKey: ['background-jobs', 'recent', limit],
    queryFn: async (): Promise<BackgroundJob[]> => {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as BackgroundJob[];
    },
    staleTime: 10_000,
  });
}

/**
 * Subscribes to realtime updates on background_jobs and surfaces
 * completion/failure as toasts. Mount once globally (e.g. inside HeaderBar).
 */
export function useJobRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`background-jobs-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'background_jobs' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['background-jobs'] });

          if (payload.eventType === 'UPDATE') {
            const next = payload.new as BackgroundJob;
            const prev = payload.old as BackgroundJob;
            if (prev.status !== next.status) {
              if (next.status === 'completed') {
                if (next.job_type === 'enrich_company') {
                  const companyId = (next.payload as Record<string, unknown>)?.company_id as string | undefined;
                  toast.success('Wzbogacenie firmy zakończone', {
                    description: 'Dane firmy zostały zaktualizowane.',
                    action: companyId ? {
                      label: 'Zobacz',
                      onClick: () => { window.location.href = `/companies/${companyId}`; },
                    } : undefined,
                  });
                  queryClient.invalidateQueries({ queryKey: ['company', companyId] });
                  queryClient.invalidateQueries({ queryKey: ['companies'] });
                } else {
                  toast.success('Zadanie w tle zakończone');
                }
              } else if (next.status === 'failed') {
                toast.error('Zadanie w tle nie powiodło się', {
                  description: next.error ?? 'Nieznany błąd',
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
