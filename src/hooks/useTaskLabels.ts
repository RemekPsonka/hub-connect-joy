import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  tenant_id: string;
  created_at: string;
}

export function useTaskLabels() {
  return useQuery({
    queryKey: ['task-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_labels')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as TaskLabel[];
    },
  });
}

export function useTaskLabelAssignments(taskId: string) {
  return useQuery({
    queryKey: ['task-label-assignments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_label_assignments')
        .select(`*, label:task_labels(*)`)
        .eq('task_id', taskId);

      if (error) throw error;
      return data as Array<{ id: string; task_id: string; label_id: string; label: TaskLabel }>;
    },
    enabled: !!taskId,
  });
}

export function useCreateTaskLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: director } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!director) throw new Error('Director not found');

      const { data, error } = await supabase
        .from('task_labels')
        .insert({ name, color, tenant_id: director.tenant_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-labels'] });
    },
  });
}

export function useAssignTaskLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, labelId }: { taskId: string; labelId: string }) => {
      const { error } = await supabase
        .from('task_label_assignments')
        .insert({ task_id: taskId, label_id: labelId });

      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-label-assignments', taskId] });
    },
  });
}

export function useUnassignTaskLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, labelId }: { taskId: string; labelId: string }) => {
      const { error } = await supabase
        .from('task_label_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('label_id', labelId);

      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-label-assignments', taskId] });
    },
  });
}

export function useDeleteTaskLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('task_labels')
        .delete()
        .eq('id', labelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-labels'] });
      queryClient.invalidateQueries({ queryKey: ['task-label-assignments'] });
    },
  });
}
