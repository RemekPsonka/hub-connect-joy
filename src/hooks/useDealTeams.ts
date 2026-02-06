import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DealTeamMember {
  id: string;
  team_id: string;
  director_id: string;
  created_at: string;
  director?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface DealTeam {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  members?: DealTeamMember[];
}

export interface DealTeamInsert {
  name: string;
  description?: string | null;
  color?: string;
  member_ids: string[]; // director IDs
}

export interface DealTeamUpdate {
  id: string;
  name?: string;
  description?: string | null;
  color?: string;
  member_ids?: string[];
}

export function useDealTeams() {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['deal_teams', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('deal_teams')
        .select(`
          *,
          members:deal_team_members(
            id,
            team_id,
            director_id,
            created_at,
            director:directors(id, full_name, email)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as DealTeam[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyDealTeams() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;
  const directorId = director?.id;

  return useQuery({
    queryKey: ['my_deal_teams', tenantId, directorId],
    queryFn: async () => {
      if (!tenantId || !directorId) return [];

      // First get team IDs where this director is a member
      const { data: memberData, error: memberError } = await supabase
        .from('deal_team_members')
        .select('team_id')
        .eq('director_id', directorId);

      if (memberError) throw memberError;

      const teamIds = memberData?.map(m => m.team_id) || [];
      if (teamIds.length === 0) return [];

      // Now get the teams
      const { data, error } = await supabase
        .from('deal_teams')
        .select('id, name, color, description')
        .in('id', teamIds)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Pick<DealTeam, 'id' | 'name' | 'color' | 'description'>[];
    },
    enabled: !!tenantId && !!directorId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDealTeam() {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useMutation({
    mutationFn: async (team: DealTeamInsert) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      // Create team
      const { data: teamData, error: teamError } = await supabase
        .from('deal_teams')
        .insert({
          tenant_id: tenantId,
          name: team.name,
          description: team.description || null,
          color: team.color || '#6366f1',
          created_by: director?.id || null,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add members
      if (team.member_ids.length > 0) {
        const members = team.member_ids.map(directorId => ({
          team_id: teamData.id,
          director_id: directorId,
        }));

        const { error: membersError } = await supabase
          .from('deal_team_members')
          .insert(members);

        if (membersError) throw membersError;
      }

      return teamData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal_teams'] });
      queryClient.invalidateQueries({ queryKey: ['my_deal_teams'] });
      toast.success('Zespół został utworzony');
    },
    onError: (error) => {
      console.error('Error creating deal team:', error);
      toast.error('Nie udało się utworzyć zespołu');
    },
  });
}

export function useUpdateDealTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (team: DealTeamUpdate) => {
      // Update team basic info
      const updateData: Record<string, unknown> = {};
      if (team.name !== undefined) updateData.name = team.name;
      if (team.description !== undefined) updateData.description = team.description;
      if (team.color !== undefined) updateData.color = team.color;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('deal_teams')
          .update(updateData)
          .eq('id', team.id);

        if (updateError) throw updateError;
      }

      // Update members if provided
      if (team.member_ids !== undefined) {
        // Delete existing members
        const { error: deleteError } = await supabase
          .from('deal_team_members')
          .delete()
          .eq('team_id', team.id);

        if (deleteError) throw deleteError;

        // Add new members
        if (team.member_ids.length > 0) {
          const members = team.member_ids.map(directorId => ({
            team_id: team.id,
            director_id: directorId,
          }));

          const { error: insertError } = await supabase
            .from('deal_team_members')
            .insert(members);

          if (insertError) throw insertError;
        }
      }

      return team.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal_teams'] });
      queryClient.invalidateQueries({ queryKey: ['my_deal_teams'] });
      toast.success('Zespół został zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating deal team:', error);
      toast.error('Nie udało się zaktualizować zespołu');
    },
  });
}

export function useDeleteDealTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from('deal_teams')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal_teams'] });
      queryClient.invalidateQueries({ queryKey: ['my_deal_teams'] });
      toast.success('Zespół został usunięty');
    },
    onError: (error) => {
      console.error('Error deleting deal team:', error);
      toast.error('Nie udało się usunąć zespołu');
    },
  });
}

export function useDealTeamWithMembers(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['deal_team', teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase
        .from('deal_teams')
        .select(`
          *,
          members:deal_team_members(
            id,
            director_id,
            director:directors(id, full_name, email)
          )
        `)
        .eq('id', teamId)
        .single();

      if (error) throw error;
      return data as DealTeam;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
}
