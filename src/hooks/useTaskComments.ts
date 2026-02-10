import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string;
  };
}

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          author:directors!task_comments_author_id_fkey(id, full_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TaskComment[];
    },
    enabled: !!taskId,
  });
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: director } = await supabase
        .from('directors')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!director) throw new Error('Director not found');

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          author_id: director.id,
          content,
          tenant_id: director.tenant_id,
        })
        .select(`*, author:directors!task_comments_author_id_fkey(id, full_name)`)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, taskId }: { commentId: string; taskId: string }) => {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
  });
}
