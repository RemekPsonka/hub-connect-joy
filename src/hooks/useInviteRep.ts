import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { InviteRepInput } from '@/types/sgu-representative';

export function useInviteRep() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteRepInput): Promise<{ user_id: string }> => {
      const { data, error } = await supabase.functions.invoke('sgu-invite-representative', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { user_id: data.user_id };
    },
    onSuccess: (_data, input) => {
      toast.success(`Zaproszenie wysłane do ${input.email}`);
      qc.invalidateQueries({ queryKey: ['sgu-representatives'] });
    },
    onError: (e: Error) => {
      toast.error(`Nie udało się wysłać zaproszenia: ${e.message}`);
    },
  });
}
