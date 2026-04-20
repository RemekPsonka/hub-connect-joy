import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TaskStatus = 'overdue' | 'today' | 'active' | 'done' | 'none';

export type TaskAssignee = { id: string; full_name: string };

export type TaskContactInfo = {
  status: TaskStatus;
  overdueCount: number;
  todayCount: number;
  activeCount: number;
  doneCount: number;
  oldestOverdue?: { title: string; due_date: string; days_ago: number };
  assignees: TaskAssignee[];
};

export function useActiveTaskContacts(teamId: string | undefined) {
  return useQuery({
    queryKey: ['active-task-contacts', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          deal_team_contact_id,
          status,
          due_date,
          title,
          assigned_to,
          assignee:directors!tasks_assigned_to_fkey(id, full_name)
        `)
        .eq('deal_team_id', teamId!)
        .in('status', ['todo', 'in_progress', 'completed'])
        .not('deal_team_contact_id', 'is', null);

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const map = new Map<string, TaskContactInfo>();

      const ensure = (cid: string): TaskContactInfo => {
        let info = map.get(cid);
        if (!info) {
          info = {
            status: 'none',
            overdueCount: 0,
            todayCount: 0,
            activeCount: 0,
            doneCount: 0,
            assignees: [],
          };
          map.set(cid, info);
        }
        return info;
      };

      const daysBetween = (dateStr: string) => {
        const ms = new Date(today).getTime() - new Date(dateStr).getTime();
        return Math.floor(ms / 86400000);
      };

      for (const t of data || []) {
        const cid = t.deal_team_contact_id as string;
        if (!cid) continue;
        const info = ensure(cid);
        const isOpen = t.status === 'todo' || t.status === 'in_progress';

        if (t.status === 'completed') {
          info.doneCount++;
        } else if (isOpen) {
          if (t.due_date && t.due_date < today) {
            info.overdueCount++;
            const days = daysBetween(t.due_date);
            if (!info.oldestOverdue || days > info.oldestOverdue.days_ago) {
              info.oldestOverdue = {
                title: (t as any).title || 'Zadanie',
                due_date: t.due_date,
                days_ago: days,
              };
            }
          } else if (t.due_date === today) {
            info.todayCount++;
          } else {
            info.activeCount++;
          }
        }

        const a = (t as any).assignee;
        if (a && a.id && !info.assignees.some((x) => x.id === a.id)) {
          info.assignees.push({ id: a.id, full_name: a.full_name || '?' });
        }
      }

      for (const info of map.values()) {
        if (info.overdueCount > 0) info.status = 'overdue';
        else if (info.todayCount > 0) info.status = 'today';
        else if (info.activeCount > 0) info.status = 'active';
        else if (info.doneCount > 0) info.status = 'done';
        else info.status = 'none';
      }

      return map;
    },
    enabled: !!teamId,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
