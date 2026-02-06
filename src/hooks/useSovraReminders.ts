import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/lib/toast';

export interface SovraReminder {
  id: string;
  type: string;
  reference_id: string | null;
  reference_type: string | null;
  message: string;
  scheduled_at: string;
  priority: string;
  read_at: string | null;
}

const QUERY_KEY = ['sovra-reminders-unread'];

export function useUnreadReminders() {
  const { director } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEY, director?.id],
    queryFn: async () => {
      if (!director?.id) return [];

      const { data, error } = await supabase
        .from('sovra_reminders')
        .select('id, type, reference_id, reference_type, message, scheduled_at, priority, read_at')
        .eq('director_id', director.id)
        .is('read_at', null)
        .order('priority', { ascending: true }) // 'high' < 'normal' alphabetically — we'll sort manually
        .order('scheduled_at', { ascending: false });

      if (error) {
        console.error('Error fetching sovra reminders:', error);
        return [];
      }

      // Sort: high priority first, then by date desc
      return (data as SovraReminder[]).sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
      });
    },
    enabled: !!director?.id,
    refetchInterval: 60_000,
  });

  return {
    reminders: data ?? [],
    count: data?.length ?? 0,
    isLoading,
  };
}

export function useMarkReminderRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('sovra_reminders')
        .update({ read_at: new Date().toISOString() })
        .eq('id', reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useMarkAllRemindersRead() {
  const { director } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!director?.id) return;

      const { error } = await supabase
        .from('sovra_reminders')
        .update({ read_at: new Date().toISOString() })
        .eq('director_id', director.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showToast.success('Wszystkie przypomnienia przeczytane');
    },
  });
}

export function useDismissReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('sovra_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showToast.info('Przypomnienie usunięte');
    },
  });
}

export function useTriggerReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ reminders_created: number }> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sovra-reminder-trigger`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Trigger failed');
      }

      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Returns navigation path for a given reminder
 */
export function getReminderLink(reminder: SovraReminder): string {
  switch (reminder.reference_type) {
    case 'task':
      return '/tasks';
    case 'project':
      return `/projects/${reminder.reference_id}`;
    case 'contact':
      return `/contacts/${reminder.reference_id}`;
    default:
      return '/my-day';
  }
}
