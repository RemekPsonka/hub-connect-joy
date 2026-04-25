import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DealTeamContact } from '@/types/dealTeam';

export type OdprawaAgendaRow = {
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  stage: string | null;
  temperature: string | null;
  is_lost: boolean | null;
  next_action_date: string | null;
  last_status_update: string | null;
  priority_bucket: '10x' | 'stalled' | 'due_soon' | 'other';
  priority_rank: number;
  active_task_count: number;
  ai_reason?: string | null;
};

export function useOdprawaAgenda(teamId: string | null | undefined, mode: string = 'standard') {
  return useQuery({
    queryKey: ['odprawa-agenda', teamId, mode],
    enabled: !!teamId,
    queryFn: async (): Promise<OdprawaAgendaRow[]> => {
      const { data, error } = await supabase.rpc('get_odprawa_agenda', {
        p_team_id: teamId as string,
        p_mode: mode,
      });
      if (error) throw error;
      return (data ?? []) as unknown as OdprawaAgendaRow[];
    },
    staleTime: 30_000,
  });
}

/**
 * Lazy-fetch full DealTeamContact (with joined contact + assigned_director)
 * by (contact_id, team_id). Used by /sgu/odprawa to open ContactTasksSheet
 * from agenda rows (which only carry contact_id from the RPC snapshot).
 */
export function useDealTeamContactByContactId(
  contactId: string | null | undefined,
  teamId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['deal_team_contact_for_agenda', contactId, teamId],
    enabled: !!contactId && !!teamId,
    staleTime: 60_000,
    queryFn: async (): Promise<DealTeamContact | null> => {
      if (!contactId || !teamId) return null;

      const { data: dealContact, error } = await supabase
        .from('deal_team_contacts')
        .select('*')
        .eq('contact_id', contactId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (error) throw error;
      if (!dealContact) return null;

      const { data: contact } = await supabase
        .from('contacts')
        .select('id, full_name, company, position, email, phone, city, company_id')
        .eq('id', dealContact.contact_id)
        .maybeSingle();

      if (contact && !contact.company && contact.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', contact.company_id)
          .maybeSingle();
        if (company) {
          (contact as unknown as { company: string }).company = company.name;
        }
      }

      let assignedDirector: { id: string; full_name: string } | null = null;
      if (dealContact.assigned_to) {
        const { data: dir } = await supabase
          .from('directors')
          .select('id, full_name')
          .eq('id', dealContact.assigned_to)
          .maybeSingle();
        if (dir) assignedDirector = { id: dir.id, full_name: dir.full_name };
      }

      return {
        ...dealContact,
        contact: contact ?? undefined,
        assigned_director: assignedDirector,
      } as unknown as DealTeamContact;
    },
  });
}

/**
 * Lazy-fetch full DealTeamContact by its primary key (deal_team_contacts.id).
 * Used by /sgu/reports cards (StalledContactsCard) to open ContactTasksSheet.
 */
export function useDealTeamContactByPk(
  dtcId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['deal_team_contact_by_pk', dtcId],
    enabled: !!dtcId,
    staleTime: 60_000,
    queryFn: async (): Promise<DealTeamContact | null> => {
      if (!dtcId) return null;

      const { data: dealContact, error } = await supabase
        .from('deal_team_contacts')
        .select('*')
        .eq('id', dtcId)
        .maybeSingle();

      if (error) throw error;
      if (!dealContact) return null;

      const { data: contact } = await supabase
        .from('contacts')
        .select('id, full_name, company, position, email, phone, city, company_id')
        .eq('id', dealContact.contact_id)
        .maybeSingle();

      if (contact && !contact.company && contact.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', contact.company_id)
          .maybeSingle();
        if (company) {
          (contact as unknown as { company: string }).company = company.name;
        }
      }

      let assignedDirector: { id: string; full_name: string } | null = null;
      if (dealContact.assigned_to) {
        const { data: dir } = await supabase
          .from('directors')
          .select('id, full_name')
          .eq('id', dealContact.assigned_to)
          .maybeSingle();
        if (dir) assignedDirector = { id: dir.id, full_name: dir.full_name };
      }

      return {
        ...dealContact,
        contact: contact ?? undefined,
        assigned_director: assignedDirector,
      } as unknown as DealTeamContact;
    },
  });
}
