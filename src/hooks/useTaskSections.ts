import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskSection {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  color: string;
  tenant_id: string;
  created_at: string;
}

export function useTaskSections(projectId: string | undefined) {
  return useQuery({
    queryKey: ['task-sections', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_sections')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order');

      if (error) throw error;
      return data as TaskSection[];
    },
    enabled: !!projectId,
  });
}

export function useCreateTaskSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, name, color }: { projectId: string; name: string; color?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!director) throw new Error('Director not found');

      // Get max sort_order
      const { data: existing } = await supabase
        .from('task_sections')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { data, error } = await supabase
        .from('task_sections')
        .insert({
          project_id: projectId,
          name,
          color: color || '#6366f1',
          sort_order: nextOrder,
          tenant_id: director.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-sections', data.project_id] });
    },
  });
}

export function useUpdateTaskSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, color, sort_order }: { id: string; name?: string; color?: string; sort_order?: number }) => {
      const update: Record<string, any> = {};
      if (name !== undefined) update.name = name;
      if (color !== undefined) update.color = color;
      if (sort_order !== undefined) update.sort_order = sort_order;

      const { data, error } = await supabase
        .from('task_sections')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-sections', data.project_id] });
    },
  });
}

export function useDeleteTaskSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('task_sections').delete().eq('id', id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['task-sections', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
  });
}
