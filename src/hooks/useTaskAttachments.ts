import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TaskAttachment {
  id: string;
  task_id: string;
  tenant_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TaskAttachment[];
    },
    enabled: !!taskId,
  });
}

export function useUploadTaskAttachment() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      if (!director) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${director.tenant_id}/${taskId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          tenant_id: director.tenant_id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type || null,
          file_size: file.size,
          uploaded_by: director.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', vars.taskId] });
      toast.success('Plik załączony');
    },
    onError: () => toast.error('Nie udało się dodać pliku'),
  });
}

export function useDeleteTaskAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId, fileUrl }: { id: string; taskId: string; fileUrl: string }) => {
      // Extract storage path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/storage/v1/object/public/task-attachments/');
      if (pathParts[1]) {
        await supabase.storage.from('task-attachments').remove([decodeURIComponent(pathParts[1])]);
      }

      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', vars.taskId] });
      toast.success('Plik usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć pliku'),
  });
}
