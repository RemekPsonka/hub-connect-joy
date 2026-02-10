import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TasksFilters } from './useTasks';

export interface SavedTaskView {
  id: string;
  name: string;
  filters: TasksFilters;
  is_default: boolean;
  created_at: string;
}

export function useSavedTaskViews() {
  return useQuery({
    queryKey: ['saved-task-views'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_task_views' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as SavedTaskView[];
    },
  });
}

export function useCreateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; filters: TasksFilters }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: director } = await supabase.from('directors').select('id, tenant_id').eq('user_id', user.id).single();
      if (!director) throw new Error('Director not found');

      const { error } = await supabase.from('saved_task_views' as any).insert({
        tenant_id: director.tenant_id,
        director_id: director.id,
        name: input.name,
        filters: input.filters as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-task-views'] });
    },
  });
}

export function useDeleteSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_task_views' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-task-views'] });
    },
  });
}
