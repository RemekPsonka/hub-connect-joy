import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Assistant {
  id: string;
  user_id: string;
  director_id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  created_at: string;
  is_active: boolean;
  director?: {
    full_name: string;
  };
  allowed_groups?: {
    id: string;
    group_id: string;
    group?: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

export interface AssistantGroupAccess {
  id: string;
  assistant_id: string;
  group_id: string;
  created_at: string;
}

// Fetch all assistants for the current director or all if admin
export function useAssistants() {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['assistants', director?.tenant_id],
    queryFn: async () => {
      if (!director?.tenant_id) return [];

      const { data, error } = await supabase
        .from('assistants')
        .select(`
          *,
          director:directors!assistants_director_id_fkey(full_name),
          allowed_groups:assistant_group_access(
            id,
            group_id,
            group:contact_groups(id, name, color)
          )
        `)
        .eq('tenant_id', director.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Assistant[];
    },
    enabled: !!director?.tenant_id,
  });
}

// Fetch assistants for a specific director
export function useDirectorAssistants(directorId?: string) {
  return useQuery({
    queryKey: ['assistants', 'director', directorId],
    queryFn: async () => {
      if (!directorId) return [];

      const { data, error } = await supabase
        .from('assistants')
        .select(`
          *,
          allowed_groups:assistant_group_access(
            id,
            group_id,
            group:contact_groups(id, name, color)
          )
        `)
        .eq('director_id', directorId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Assistant[];
    },
    enabled: !!directorId,
  });
}

// Create a new assistant
export function useCreateAssistant() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({
      email,
      fullName,
      groupIds,
    }: {
      email: string;
      fullName: string;
      groupIds: string[];
    }) => {
      if (!director) throw new Error('Brak autoryzacji');

      const { data, error } = await supabase.functions.invoke('create-assistant', {
        body: {
          email,
          fullName,
          groupIds,
          directorId: director.id,
          tenantId: director.tenant_id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      toast.success('Asystent został utworzony');
    },
    onError: (error: Error) => {
      toast.error(`Błąd tworzenia asystenta: ${error.message}`);
    },
  });
}

// Update assistant data
export function useUpdateAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assistantId,
      fullName,
      isActive,
    }: {
      assistantId: string;
      fullName?: string;
      isActive?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (fullName !== undefined) updates.full_name = fullName;
      if (isActive !== undefined) updates.is_active = isActive;

      const { error } = await supabase
        .from('assistants')
        .update(updates)
        .eq('id', assistantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      toast.success('Dane asystenta zostały zaktualizowane');
    },
    onError: (error: Error) => {
      toast.error(`Błąd aktualizacji: ${error.message}`);
    },
  });
}

// Update assistant's allowed groups
export function useUpdateAssistantGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assistantId,
      groupIds,
    }: {
      assistantId: string;
      groupIds: string[];
    }) => {
      // First delete all existing group access
      const { error: deleteError } = await supabase
        .from('assistant_group_access')
        .delete()
        .eq('assistant_id', assistantId);

      if (deleteError) throw deleteError;

      // Then insert new ones
      if (groupIds.length > 0) {
        const insertData = groupIds.map((groupId) => ({
          assistant_id: assistantId,
          group_id: groupId,
        }));

        const { error: insertError } = await supabase
          .from('assistant_group_access')
          .insert(insertData);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      toast.success('Grupy asystenta zostały zaktualizowane');
    },
    onError: (error: Error) => {
      toast.error(`Błąd aktualizacji grup: ${error.message}`);
    },
  });
}

// Delete (deactivate) assistant
export function useDeleteAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assistantId: string) => {
      const { error } = await supabase
        .from('assistants')
        .update({ is_active: false })
        .eq('id', assistantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
      toast.success('Asystent został dezaktywowany');
    },
    onError: (error: Error) => {
      toast.error(`Błąd usuwania asystenta: ${error.message}`);
    },
  });
}
