import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  contact_id?: string;
  in_reply_to?: string;
}

export interface DraftEmailInput {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  contact_id?: string;
}

export function useSendEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendEmailInput) => {
      const { data, error } = await supabase.functions.invoke('gmail-send', { body: input });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Wysyłka nie powiodła się');
      return data as { ok: true; outbox_id: string; gmail_message_id: string };
    },
    onSuccess: (_d, vars) => {
      toast.success('E-mail wysłany');
      qc.invalidateQueries({ queryKey: ['gmail-outbox'] });
      if (vars.contact_id) qc.invalidateQueries({ queryKey: ['gmail-outbox', vars.contact_id] });
    },
    onError: (err: Error) => toast.error(`Błąd wysyłki: ${err.message}`),
  });
}

export function useCreateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DraftEmailInput) => {
      const { data, error } = await supabase.functions.invoke('gmail-create-draft', { body: input });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Zapis szkicu nie powiódł się');
      return data as { ok: true; outbox_id: string; gmail_draft_id: string };
    },
    onSuccess: (_d, vars) => {
      toast.success('Szkic zapisany w Gmailu');
      qc.invalidateQueries({ queryKey: ['gmail-outbox'] });
      if (vars.contact_id) qc.invalidateQueries({ queryKey: ['gmail-outbox', vars.contact_id] });
    },
    onError: (err: Error) => toast.error(`Błąd zapisu szkicu: ${err.message}`),
  });
}

export function useGmailOutbox(contactId?: string) {
  return useQuery({
    queryKey: ['gmail-outbox', contactId],
    queryFn: async () => {
      let q = supabase
        .from('gmail_outbox')
        .select('id, to, cc, subject, body_plain, status, error, gmail_message_id, gmail_draft_id, created_at, sent_at, contact_id')
        .order('created_at', { ascending: false })
        .limit(50);
      if (contactId) q = q.eq('contact_id', contactId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
