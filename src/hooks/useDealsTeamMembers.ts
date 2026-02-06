import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  DealTeamMember, 
  DealTeamRole, 
  AddTeamMemberInput, 
  UpdateMemberRoleInput 
} from '@/types/dealTeam';

// ===== QUERIES =====

/**
 * Pobiera członków zespołu z danymi directora
 */
export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['deal-team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('deal_team_members')
        .select(`
          *,
          director:directors(id, full_name, email)
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data as DealTeamMember[];
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Pobiera wszystkich directorów w tenant (do wyboru przy dodawaniu członków)
 */
export function useDirectorsByTenant() {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['tenant-directors', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('directors')
        .select('id, full_name, email')
        .eq('tenant_id', tenantId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

// ===== MUTATIONS =====

/**
 * Dodaje directora do zespołu
 */
export function useAddTeamMember() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async ({ teamId, directorId, role }: AddTeamMemberInput) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      // Sprawdź czy director już nie jest członkiem
      const { data: existing } = await supabase
        .from('deal_team_members')
        .select('id, is_active')
        .eq('team_id', teamId)
        .eq('director_id', directorId)
        .maybeSingle();

      if (existing?.is_active) {
        throw new Error('Ten użytkownik jest już członkiem zespołu');
      }

      // Jeśli istnieje nieaktywny rekord, reaktywuj go
      if (existing && !existing.is_active) {
        const { error } = await supabase
          .from('deal_team_members')
          .update({ is_active: true, role })
          .eq('id', existing.id);

        if (error) throw error;
        return { reactivated: true };
      }

      // Dodaj nowego członka
      const { error } = await supabase
        .from('deal_team_members')
        .insert({
          team_id: teamId,
          director_id: directorId,
          tenant_id: tenantId,
          role,
        });

      if (error) throw error;
      return { reactivated: false };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-members', variables.teamId] });
      toast.success('Członek został dodany do zespołu');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}

/**
 * Usuwa członka z zespołu (soft delete)
 */
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, teamId }: { memberId: string; teamId: string }) => {
      const { error } = await supabase
        .from('deal_team_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-members', result.teamId] });
      toast.success('Członek został usunięty z zespołu');
    },
    onError: (error: Error) => {
      toast.error(`Błąd usuwania: ${error.message}`);
    },
  });
}

/**
 * Zmienia rolę członka zespołu
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role, teamId }: UpdateMemberRoleInput) => {
      const { error } = await supabase
        .from('deal_team_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-members', result.teamId] });
      toast.success('Rola członka została zmieniona');
    },
    onError: (error: Error) => {
      toast.error(`Błąd zmiany roli: ${error.message}`);
    },
  });
}

/**
 * Sprawdza czy aktualny użytkownik jest liderem zespołu
 */
export function useIsTeamLeader(teamId: string | undefined) {
  const { director } = useAuth();
  const { data: members = [] } = useTeamMembers(teamId);

  if (!teamId || !director) return false;

  const currentMember = members.find(m => m.director_id === director.id);
  return currentMember?.role === 'leader';
}
