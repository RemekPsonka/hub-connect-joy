import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { BIAnswers } from '@/lib/bi/questions.v2';

export interface ContactBIRow {
  contact_id: string;
  tenant_id: string;
  answers: BIAnswers;
  ai_summary: string | null;
  filled_by_ai: boolean;
  last_filled_at: string | null;
  updated_at: string;
}

export function useContactBI(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-bi', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const { data, error } = await supabase
        .from('contact_bi')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();
      if (error) throw error;
      return data as ContactBIRow | null;
    },
    enabled: !!contactId,
  });
}

export function useUpsertContactBI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contactId,
      tenantId,
      answers,
    }: {
      contactId: string;
      tenantId: string;
      answers: BIAnswers;
    }) => {
      const { data, error } = await supabase
        .from('contact_bi')
        .upsert({
          contact_id: contactId,
          tenant_id: tenantId,
          answers,
          filled_by_ai: false,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as ContactBIRow;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['contact-bi', vars.contactId] });
      toast.success('Zapisano odpowiedzi BI');
    },
    onError: (e: Error) => toast.error(`Błąd zapisu: ${e.message}`),
  });
}

export function useFillBIFromNotesViaSovra() {
  const navigate = useNavigate();
  return (contactId: string, contactName: string) => {
    const message = `Wypełnij BI kontaktu ${contactName} (id: ${contactId}) na podstawie notatek i konsultacji.`;
    navigate(
      `/sovra?context=contact&id=${contactId}&prefill=${encodeURIComponent(message)}`,
    );
  };
}
