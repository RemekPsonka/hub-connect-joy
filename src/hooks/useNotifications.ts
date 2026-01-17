import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  tenant_id: string;
  director_id: string;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  read: boolean;
  read_at?: string;
  action_taken: boolean;
  action_taken_at?: string;
  priority: string;
  created_at: string;
  expires_at?: string;
}

export const useNotifications = (limit: number = 20) => {
  const { director } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', director?.id, limit],
    queryFn: async () => {
      if (!director?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('director_id', director.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data as Notification[];
    },
    enabled: !!director?.id,
    refetchInterval: 60000 // Refresh every minute
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // Real-time subscription
  useEffect(() => {
    if (!director?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `director_id=eq.${director.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Show toast for new notification
          toast(newNotification.title, {
            description: newNotification.message,
            action: {
              label: 'Zobacz',
              onClick: () => {
                // Navigate based on entity type
                if (newNotification.entity_type && newNotification.entity_id) {
                  window.location.href = getNotificationLink(newNotification);
                }
              }
            }
          });
          
          // Invalidate query to refresh
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [director?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!director?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('director_id', director.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Wszystkie powiadomienia oznaczone jako przeczytane');
    }
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead: (id: string) => markAsRead.mutate(id),
    markAllAsRead: () => markAllAsRead.mutate(),
    deleteNotification: (id: string) => deleteNotification.mutate(id)
  };
};

export const getNotificationLink = (notification: Notification): string => {
  switch (notification.entity_type) {
    case 'consultation':
      return `/consultations/${notification.entity_id}`;
    case 'task':
      return `/tasks?id=${notification.entity_id}`;
    case 'match':
      return `/search?match=${notification.entity_id}`;
    case 'contact':
      return `/contacts/${notification.entity_id}`;
    case 'serendipity':
      return '/'; // Dashboard shows serendipity
    default:
      return '/notifications';
  }
};

export const getNotificationIcon = (type: string): string => {
  switch (type) {
    case 'consultation_reminder':
      return 'calendar';
    case 'task_overdue':
      return 'alert-circle';
    case 'new_match':
      return 'link';
    case 'relationship_decay':
      return 'heart-crack';
    case 'serendipity':
      return 'lightbulb';
    default:
      return 'bell';
  }
};
