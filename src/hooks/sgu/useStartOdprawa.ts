import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { OdprawaSession } from './useActiveOdprawaSession';

interface StartOdprawaInput {
  teamId: string;
  tenantId: string;
}

export function useStartOdprawa() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ teamId, tenantId }: StartOdprawaInput): Promise<OdprawaSession> => {
      if (!user) throw new Error('Brak zalogowanego użytkownika');

      const { data, error } = await supabase
        .from('odprawa_sessions' as never)
        .insert({
          team_id: teamId,
          tenant_id: tenantId,
          started_by: user.id,
          status: 'open',
        } as never)
        .select('*')
        .single();

      if (error) throw error;
      return data as OdprawaSession;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['odprawa-active-session', vars.teamId] });
      qc.invalidateQueries({ queryKey: ['odprawa-history', vars.teamId] });
      toast.success('Odprawa rozpoczęta');
    },
    onError: (err: Error) => {
      const msg = err.message.includes('one_open_per_team')
        ? 'Jest już otwarta odprawa dla tego zespołu'
        : err.message;
      toast.error(`Nie udało się rozpocząć odprawy: ${msg}`);
    },
  });
}