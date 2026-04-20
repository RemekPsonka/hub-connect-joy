import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useContactTldr(contactId: string) {
  return useQuery({
    queryKey: ['contact-tldr', contactId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('sovra-contact-tldr', {
        body: { contact_id: contactId },
      });
      console.log('[tldr]', { data, error, contact_id: contactId });
      if (error) throw error;
      return data as { tldr: string; generated_at: string; cached: boolean; error?: boolean; message?: string };
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!contactId,
  });
}
