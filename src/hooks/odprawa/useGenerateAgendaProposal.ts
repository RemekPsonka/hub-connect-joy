import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerateResult {
  ok: boolean;
  proposal_id?: string | null;
  ranked?: number;
  error?: string;
}

/**
 * ODPRAWA-03 Faza C — manualny refresh AI agendy dla teamu.
 * Wywołuje edge function `agenda-builder` (mode: manual).
 */
export function useGenerateAgendaProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string): Promise<GenerateResult> => {
      const { data, error } = await supabase.functions.invoke('agenda-builder', {
        body: { team_id: teamId },
      });
      if (error) throw error;
      return (data ?? {}) as GenerateResult;
    },
    onSuccess: (res, teamId) => {
      if (!res.ok) {
        toast.error(res.error ?? 'Nie udało się wygenerować agendy AI');
        return;
      }
      toast.success(
        res.ranked
          ? `AI uszeregowała ${res.ranked} kontaktów`
          : 'Agenda AI zaktualizowana',
      );
      qc.invalidateQueries({ queryKey: ['odprawa-agenda', teamId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Błąd wywołania AI';
      toast.error(msg);
    },
  });
}