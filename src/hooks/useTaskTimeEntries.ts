import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TaskTimeEntry {
  id: string;
  task_id: string;
  director_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  note: string | null;
  tenant_id: string;
  created_at: string;
}

export function useTaskTimeEntries(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-time-entries', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_time_entries')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TaskTimeEntry[];
    },
    enabled: !!taskId,
  });
}

export function useTaskTotalTime(taskId: string | undefined) {
  const { data: entries } = useTaskTimeEntries(taskId);
  const total = entries?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) ?? 0;
  return total;
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      task_id: string;
      started_at: string;
      ended_at?: string;
      duration_minutes: number;
      note?: string;
    }) => {
      const { data, error } = await supabase
        .from('task_time_entries')
        .insert({
          ...input,
          director_id: director!.id,
          tenant_id: director!.tenant_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task-time-entries', vars.task_id] });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase
        .from('task_time_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] });
    },
  });
}
