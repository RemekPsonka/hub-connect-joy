import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentDirector } from '@/hooks/useDirectors';

export function useTeamWatchedContacts(teamId: string) {
  return useQuery({
    queryKey: ['team-watched-contacts', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_team_watched_contacts')
        .select('*, contact:contacts(id, full_name, company, position, email)')
        .eq('team_id', teamId);
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}

export function useWantedForWatchedContacts(contactIds: string[]) {
  return useQuery({
    queryKey: ['wanted-for-watched', contactIds],
    queryFn: async () => {
      if (!contactIds.length) return [];
      const { data, error } = await supabase
        .from('wanted_contacts')
        .select('*, requested_by:contacts!wanted_contacts_requested_by_contact_id_fkey(id, full_name, company), matched_director:directors!wanted_contacts_matched_by_fkey(id, full_name)')
        .in('requested_by_contact_id', contactIds)
        .not('status', 'in', '("cancelled")');
      if (error) throw error;
      return data;
    },
    enabled: contactIds.length > 0,
  });
}

export function useAddWatchedContact() {
  const qc = useQueryClient();
  const { data: director } = useCurrentDirector();

  return useMutation({
    mutationFn: async ({ teamId, contactId, tenantId }: { teamId: string; contactId: string; tenantId: string }) => {
      const { error } = await supabase
        .from('deal_team_watched_contacts')
        .insert({
          team_id: teamId,
          contact_id: contactId,
          tenant_id: tenantId,
          added_by: director?.id,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['team-watched-contacts', vars.teamId] });
      qc.invalidateQueries({ queryKey: ['wanted-for-watched'] });
    },
  });
}

export function useRemoveWatchedContact() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase
        .from('deal_team_watched_contacts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return teamId;
    },
    onSuccess: (teamId) => {
      qc.invalidateQueries({ queryKey: ['team-watched-contacts', teamId] });
      qc.invalidateQueries({ queryKey: ['wanted-for-watched'] });
    },
  });
}
