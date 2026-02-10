import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Milestone {
  id: string;
  project_id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useProjectMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!projectId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (input: { projectId: string; name: string; description?: string; due_date?: string }) => {
      // Get max sort_order
      const { data: existing } = await supabase
        .from('project_milestones')
        .select('sort_order')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { data, error } = await supabase
        .from('project_milestones')
        .insert({
          project_id: input.projectId,
          tenant_id: director!.tenant_id,
          name: input.name,
          description: input.description || null,
          due_date: input.due_date || null,
          sort_order: nextOrder,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', vars.projectId] });
      toast.success('Kamień milowy dodany');
    },
    onError: () => toast.error('Nie udało się dodać kamienia milowego'),
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId, ...data }: { id: string; projectId: string; name?: string; description?: string; due_date?: string; status?: string }) => {
      const { error } = await supabase
        .from('project_milestones')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', vars.projectId] });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_milestones')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', vars.projectId] });
      toast.success('Kamień milowy usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć kamienia milowego'),
  });
}
