import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContactGroupShare {
  id: string;
  tenant_id: string;
  group_id: string;
  shared_with_director_id: string | null;
  shared_with_team_id: string | null;
  created_at: string;
  director?: { id: string; full_name: string; email: string } | null;
  team?: { id: string; name: string; color: string } | null;
}

export function useContactGroupShares() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['contact_group_shares', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('contact_group_shares')
        .select(`
          *,
          director:directors!contact_group_shares_shared_with_director_id_fkey(id, full_name, email),
          team:deal_teams!contact_group_shares_shared_with_team_id_fkey(id, name, color)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactGroupShare[];
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAddContactGroupShare() {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useMutation({
    mutationFn: async (params: {
      groupId: string;
      directorId?: string;
      teamId?: string;
    }) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      const { data, error } = await supabase
        .from('contact_group_shares')
        .insert({
          tenant_id: tenantId,
          group_id: params.groupId,
          shared_with_director_id: params.directorId || null,
          shared_with_team_id: params.teamId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_group_shares'] });
      toast.success('Udostępnienie zostało dodane');
    },
    onError: (error: any) => {
      console.error('Error adding share:', error);
      if (error?.code === '23505') {
        toast.error('To udostępnienie już istnieje');
      } else {
        toast.error('Nie udało się dodać udostępnienia');
      }
    },
  });
}

export function useRemoveContactGroupShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from('contact_group_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      return shareId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_group_shares'] });
      toast.success('Udostępnienie zostało usunięte');
    },
    onError: (error) => {
      console.error('Error removing share:', error);
      toast.error('Nie udało się usunąć udostępnienia');
    },
  });
}
