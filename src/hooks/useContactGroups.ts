import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type ContactGroup = Tables<'contact_groups'>;
export type ContactGroupInsert = TablesInsert<'contact_groups'>;
export type ContactGroupUpdate = TablesUpdate<'contact_groups'>;

export function useContactGroups() {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['contact_groups', director?.tenant_id],
    queryFn: async () => {
      if (!director?.tenant_id) return [];

      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('tenant_id', director.tenant_id)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data as ContactGroup[];
    },
    enabled: !!director?.tenant_id,
  });
}

export function useCreateContactGroup() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (group: Omit<ContactGroupInsert, 'tenant_id'>) => {
      if (!director?.tenant_id) throw new Error('Brak tenant_id');

      const { data, error } = await supabase
        .from('contact_groups')
        .insert({ ...group, tenant_id: director.tenant_id })
        .select()
        .single();

      if (error) throw error;

      return data as ContactGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_groups'] });
      toast.success('Grupa została utworzona');
    },
    onError: (error) => {
      console.error('Error creating group:', error);
      toast.error('Nie udało się utworzyć grupy');
    },
  });
}

export function useUpdateContactGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactGroupUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contact_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as ContactGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_groups'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Grupa została zaktualizowana');
    },
    onError: (error) => {
      console.error('Error updating group:', error);
      toast.error('Nie udało się zaktualizować grupy');
    },
  });
}

export function useDeleteContactGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, unassign all contacts from this group
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ primary_group_id: null })
        .eq('primary_group_id', id);

      if (updateError) throw updateError;

      // Then delete the group
      const { error } = await supabase
        .from('contact_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact_groups'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Grupa została usunięta');
    },
    onError: (error) => {
      console.error('Error deleting group:', error);
      toast.error('Nie udało się usunąć grupy');
    },
  });
}
