import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AbandonOdprawaInput {
  sessionId: string;
  teamId: string;
}

export function useAbandonOdprawa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: AbandonOdprawaInput) => {
      const { error } = await supabase
        .from('odprawa_sessions' as never)
        .update({ status: 'abandoned', ended_at: new Date().toISOString() } as never)
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['odprawa-active-session', vars.teamId] });
      qc.invalidateQueries({ queryKey: ['odprawa-history', vars.teamId] });
      toast.success('Odprawa porzucona');
    },
    onError: (err: Error) => {
      toast.error(`Nie udało się porzucić odprawy: ${err.message}`);
    },
  });
}

export function useCloseOdprawa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      summary,
      coveredContactIds,
    }: {
      sessionId: string;
      teamId: string;
      summary?: string;
      coveredContactIds?: string[];
    }) => {
      const { error } = await supabase
        .from('odprawa_sessions' as never)
        .update({
          status: 'closed',
          ended_at: new Date().toISOString(),
          summary: summary ?? null,
          covered_contact_ids: coveredContactIds ?? [],
        } as never)
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['odprawa-active-session', vars.teamId] });
      qc.invalidateQueries({ queryKey: ['odprawa-history', vars.teamId] });
      toast.success('Odprawa zakończona');
    },
    onError: (err: Error) => {
      toast.error(`Nie udało się zakończyć odprawy: ${err.message}`);
    },
  });
}