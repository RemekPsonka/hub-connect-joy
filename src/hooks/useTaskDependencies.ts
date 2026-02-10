import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'blocks' | 'blocked_by' | 'related';
  created_at: string;
  related_task?: {
    id: string;
    title: string;
    status: string;
  };
}

export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: async () => {
      // Get tasks this task depends on (blocked by)
      const { data: blockedBy, error: e1 } = await supabase
        .from('task_dependencies')
        .select(`*, related_task:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)`)
        .eq('task_id', taskId);

      if (e1) throw e1;

      // Get tasks that depend on this task (blocks)
      const { data: blocks, error: e2 } = await supabase
        .from('task_dependencies')
        .select(`*, related_task:tasks!task_dependencies_task_id_fkey(id, title, status)`)
        .eq('depends_on_task_id', taskId);

      if (e2) throw e2;

      return {
        blockedBy: (blockedBy || []) as TaskDependency[],
        blocks: (blocks || []) as TaskDependency[],
      };
    },
    enabled: !!taskId,
  });
}

export function useCreateTaskDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      dependsOnTaskId,
      type,
    }: {
      taskId: string;
      dependsOnTaskId: string;
      type: 'blocks' | 'blocked_by' | 'related';
    }) => {
      // Normalize: always store as task_id depends_on depends_on_task_id
      const actualTaskId = type === 'blocks' ? dependsOnTaskId : taskId;
      const actualDependsOn = type === 'blocks' ? taskId : dependsOnTaskId;

      const { error } = await supabase.from('task_dependencies').insert({
        task_id: actualTaskId,
        depends_on_task_id: actualDependsOn,
        dependency_type: type === 'related' ? 'related' : 'blocks',
      });

      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
    },
  });
}

export function useDeleteTaskDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ depId, taskId }: { depId: string; taskId: string }) => {
      const { error } = await supabase.from('task_dependencies').delete().eq('id', depId);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
    },
  });
}
