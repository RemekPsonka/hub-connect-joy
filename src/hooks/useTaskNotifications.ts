import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface TaskNotification {
  id: string;
  task_id: string | null;
  director_id: string;
  type: string;
  title: string;
  message: string | null;
  read_at: string | null;
  tenant_id: string;
  created_at: string;
}

export function useTaskNotifications(limit = 20) {
  const { director } = useAuth();
  const queryClient = useQueryClient();
  const directorId = director?.id;

  // Realtime subscription
  useEffect(() => {
    if (!directorId) return;

    const channel = supabase
      .channel('task-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_notifications',
          filter: `director_id=eq.${directorId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task-notifications'] });
          queryClient.invalidateQueries({ queryKey: ['task-notifications-count'] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [directorId, queryClient]);

  return useQuery({
    queryKey: ['task-notifications', directorId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_notifications')
        .select('*')
        .eq('director_id', directorId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as TaskNotification[];
    },
    enabled: !!directorId,
  });
}

export function useUnreadTaskNotifCount() {
  const { director } = useAuth();
  const directorId = director?.id;

  const { data } = useQuery({
    queryKey: ['task-notifications-count', directorId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('task_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('director_id', directorId!)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!directorId,
  });

  return data ?? 0;
}

export function useMarkTaskNotifRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['task-notifications-count'] });
    },
  });
}

export function useMarkAllTaskNotifsRead() {
  const { director } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('task_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('director_id', director!.id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['task-notifications-count'] });
    },
  });
}
