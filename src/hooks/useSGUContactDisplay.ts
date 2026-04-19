import { useLayoutMode } from '@/store/layoutMode';
import { useCRMContactBasic } from '@/hooks/useCRMContactBasic';
import type { DealTeamContact } from '@/types/dealTeam';

interface SGUDisplay {
  /** True when card renders in SGU layout AND deal contact came from CRM (has source_contact_id). */
  isSguRef: boolean;
  /** Display name — falls back to local join when CRM RPC is loading or unavailable. */
  fullName: string | null | undefined;
  company: string | null | undefined;
  email: string | null | undefined;
  phone: string | null | undefined;
}

/**
 * In SGU layout, replaces direct CRM joins (contact.contact?.*) with values
 * coming from the SECURITY DEFINER RPC `rpc_sgu_get_crm_contact_basic`.
 * In CRM layout (or for SGU records without source_contact_id), returns
 * the existing local join values unchanged.
 */
export function useSGUContactDisplay(contact: Pick<DealTeamContact, 'source_contact_id' | 'contact'>): SGUDisplay {
  const { mode } = useLayoutMode();
  const isSguRef = mode === 'sgu' && !!contact.source_contact_id;
  const { data: crmBasic } = useCRMContactBasic(isSguRef ? contact.source_contact_id : null);

  if (!isSguRef) {
    return {
      isSguRef: false,
      fullName: contact.contact?.full_name,
      company: contact.contact?.company,
      email: contact.contact?.email,
      phone: contact.contact?.phone,
    };
  }

  return {
    isSguRef: true,
    fullName: crmBasic?.full_name ?? contact.contact?.full_name ?? null,
    company: crmBasic?.company_name ?? contact.contact?.company ?? null,
    email: crmBasic?.email ?? contact.contact?.email ?? null,
    phone: crmBasic?.phone ?? contact.contact?.phone ?? null,
  };
}
