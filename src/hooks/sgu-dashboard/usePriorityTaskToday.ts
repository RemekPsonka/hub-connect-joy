import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardPriorityItem } from '@/types/sgu-dashboard';

export function usePriorityTaskToday() {
  return useQuery({
    queryKey: ['sgu-priority', 'task-today'],
    queryFn: async (): Promise<DashboardPriorityItem | null> => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('priority', 'high')
        .gte('due_date', start.toISOString())
        .lt('due_date', end.toISOString())
        .order('due_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const time = data.due_date
        ? new Date(data.due_date).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—';
      return {
        kind: 'task',
        id: data.id,
        title: data.title,
        meta: `Termin dziś ${time}`,
        navigateTo: '/sgu/zadania?filter=today&priority=high',
      };
    },
    staleTime: 60_000,
  });
}
