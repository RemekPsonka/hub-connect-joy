import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  metadata: any;
  tenant_id: string;
  created_at: string;
  actor?: { id: string; full_name: string } | null;
}

export function useTaskActivityLog(taskId: string) {
  return useQuery({
    queryKey: ['task-activity-log', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_activity_log' as any)
        .select('*, actor:directors!task_activity_log_actor_id_fkey(id, full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as TaskActivity[];
    },
    enabled: !!taskId,
  });
}
