import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CRMContactBasic {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
}

/**
 * SGU reference-only access to a CRM contact.
 * Calls the SECURITY DEFINER RPC `rpc_sgu_get_crm_contact_basic` which:
 *  - returns only 4 fields (full_name, email, phone, company_name),
 *  - logs the read into `audit_crm_contact_reads`,
 *  - works for SGU users without granting them direct SELECT on `contacts`.
 */
export function useCRMContactBasic(contactId: string | null | undefined) {
  return useQuery<CRMContactBasic | null>({
    queryKey: ['sgu-crm-contact-basic', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const { data, error } = await supabase.rpc('rpc_sgu_get_crm_contact_basic', {
        p_contact_id: contactId,
      });
      if (error) throw error;
      return (data ?? null) as CRMContactBasic | null;
    },
    enabled: !!contactId,
    staleTime: 5 * 60 * 1000,
  });
}
