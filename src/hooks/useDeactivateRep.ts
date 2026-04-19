import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useDeactivateRep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const { error } = await supabase.rpc('rpc_sgu_deactivate_representative', {
        p_user_id: userId,
        p_reason: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Przedstawiciel został dezaktywowany');
      qc.invalidateQueries({ queryKey: ['sgu-representatives'] });
      qc.invalidateQueries({ queryKey: ['sgu-rep-assignments'] });
    },
    onError: (e: Error) => toast.error(`Błąd dezaktywacji: ${e.message}`),
  });
}

export function useReactivateRep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase.rpc('rpc_sgu_reactivate_representative', {
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Przedstawiciel został reaktywowany');
      qc.invalidateQueries({ queryKey: ['sgu-representatives'] });
    },
    onError: (e: Error) => toast.error(`Błąd reaktywacji: ${e.message}`),
  });
}
