import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSGUTeamId } from './useSGUTeamId';

export type SGUTaskFilter = 'today' | 'overdue' | 'my_clients';

export interface SGUTask {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  assigned_to_user_id: string | null;
  deal_team_contact_id: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function useSGUTasks(filter: SGUTaskFilter) {
  const { user } = useAuth();
  const { sguTeamId } = useSGUTeamId();

  return useQuery({
    queryKey: ['sgu-tasks', filter, user?.id, sguTeamId],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SGUTask[]> => {
      let q = supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_date, assigned_to_user_id, deal_team_contact_id')
        .neq('status', 'completed')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filter === 'today') {
        q = q.eq('due_date', todayISO()).eq('assigned_to_user_id', user!.id);
      } else if (filter === 'overdue') {
        q = q.lt('due_date', todayISO()).eq('assigned_to_user_id', user!.id);
      } else if (filter === 'my_clients') {
        if (sguTeamId) q = q.eq('deal_team_id', sguTeamId);
        q = q.eq('assigned_to_user_id', user!.id);
      }

      const { data, error } = await q.limit(200);
      if (error) throw error;
      return (data ?? []) as SGUTask[];
    },
  });
}

export function useSGUTaskMutations() {
  const qc = useQueryClient();

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sgu-tasks'] }),
  });

  const snoozeOneDay = useMutation({
    mutationFn: async ({ id, currentDue }: { id: string; currentDue: string | null }) => {
      const base = currentDue ? new Date(currentDue) : new Date();
      base.setDate(base.getDate() + 1);
      const next = base.toISOString().slice(0, 10);
      const { error } = await supabase.from('tasks').update({ due_date: next }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sgu-tasks'] }),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await supabase.from('tasks').update({ description }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sgu-tasks'] }),
  });

  return { markDone, snoozeOneDay, updateNote };
}
