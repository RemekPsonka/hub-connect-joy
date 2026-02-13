import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TaskStatus = 'active' | 'overdue';

export function useActiveTaskContacts(teamId: string | undefined) {
  return useQuery({
    queryKey: ['active-task-contacts', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('deal_team_contact_id, status, due_date')
        .eq('deal_team_id', teamId!)
        .in('status', ['todo', 'in_progress'])
        .not('deal_team_contact_id', 'is', null);

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const statusMap = new Map<string, TaskStatus>();

      for (const task of data || []) {
        const contactId = task.deal_team_contact_id as string;
        const isOverdue = !!task.due_date && task.due_date < today;

        const existing = statusMap.get(contactId);
        // Overdue takes priority over active
        if (isOverdue || !existing) {
          statusMap.set(contactId, isOverdue ? 'overdue' : 'active');
        }
      }

      return statusMap;
    },
    enabled: !!teamId,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });
}
