import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  Calendar,
  AlertCircle,
  Link,
  HeartCrack,
  Lightbulb,
  Check,
  Clock,
  FolderOpen,
  Users,
  ArrowRight,
  Sparkles,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useNotifications, getNotificationLink } from '@/hooks/useNotifications';
import {
  useUnreadReminders,
  useMarkReminderRead,
  useMarkAllRemindersRead,
  useDismissReminder,
  useTriggerReminders,
  getReminderLink,
  type SovraReminder,
} from '@/hooks/useSovraReminders';
import { cn } from '@/lib/utils';

// ── Notification icon helper ──
function getNotifIcon(type: string) {
  switch (type) {
    case 'consultation_reminder':
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case 'task_overdue':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'new_match':
      return <Link className="h-4 w-4 text-green-500" />;
    case 'relationship_decay':
      return <HeartCrack className="h-4 w-4 text-orange-500" />;
    case 'serendipity':
      return <Lightbulb className="h-4 w-4 text-amber-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

// ── Reminder icon helper ──
function getReminderIcon(type: string) {
  switch (type) {
    case 'deadline':
    case 'overdue':
      return (
        <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
          <Clock className="h-4 w-4 text-red-500" />
        </div>
      );
    case 'inactive_project':
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
          <FolderOpen className="h-4 w-4 text-amber-500" />
        </div>
      );
    case 'contact':
      return (
        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-blue-500" />
        </div>
      );
    case 'follow_up':
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
          <ArrowRight className="h-4 w-4 text-emerald-500" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
      );
  }
}

// ── Sovra Tab Content ──
function SovraTabContent() {
  const navigate = useNavigate();
  const { reminders, count, isLoading } = useUnreadReminders();
  const markRead = useMarkReminderRead();
  const markAllRead = useMarkAllRemindersRead();
  const dismiss = useDismissReminder();
  const trigger = useTriggerReminders();

  const handleClick = (reminder: SovraReminder) => {
    markRead.mutate(reminder.id);
    navigate(getReminderLink(reminder));
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Przypomnienia Sovry</span>
        {count > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-primary"
            onClick={() => markAllRead.mutate()}
          >
            <Check className="h-3 w-3 mr-1" />
            Oznacz wszystkie
          </Button>
        )}
      </div>

      {/* List */}
      <ScrollArea className="max-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="py-8 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Brak przypomnień</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Sovra Cię poinformuje gdy coś będzie wymagało uwagi
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={cn(
                  'flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group',
                  'bg-violet-50/50 dark:bg-violet-950/20 border-l-2 border-l-primary'
                )}
              >
                <button
                  onClick={() => handleClick(reminder)}
                  className="flex gap-3 flex-1 min-w-0 text-left"
                >
                  {getReminderIcon(reminder.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {reminder.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reminder.scheduled_at), {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </span>
                      {reminder.priority === 'high' && (
                        <span className="text-[10px] text-destructive font-medium">
                          ⚡ Pilne
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => dismiss.mutate(reminder.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive text-muted-foreground shrink-0 self-center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={() => trigger.mutate()}
          disabled={trigger.isPending}
        >
          {trigger.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {trigger.isPending ? 'Sovra sprawdza...' : 'Odśwież'}
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ──
export const NotificationBell = () => {
  const navigate = useNavigate();
  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications(10);

  const { count: sovraCount } = useUnreadReminders();
  const totalCount = unreadCount + sovraCount;

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    const link = getNotificationLink(notification);
    navigate(link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <Tabs defaultValue={sovraCount > 0 ? 'sovra' : 'notifications'}>
          <div className="border-b border-border px-2 pt-2">
            <TabsList className="w-full h-8">
              <TabsTrigger value="notifications" className="flex-1 text-xs gap-1">
                Powiadomienia
                {unreadCount > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 min-w-[18px] inline-flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="sovra" className="flex-1 text-xs gap-1">
                Sovra
                {sovraCount > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 min-w-[18px] inline-flex items-center justify-center">
                    {sovraCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Notifications Tab (existing logic preserved) ── */}
          <TabsContent value="notifications" className="m-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h4 className="font-semibold text-sm">Powiadomienia</h4>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => markAllAsRead()}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Oznacz wszystkie
                </Button>
              )}
            </div>

            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Ładowanie...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground text-sm">Brak powiadomień</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full p-3 text-left hover:bg-muted/50 transition-colors flex gap-3',
                        !notification.read && 'bg-primary/5'
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotifIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm truncate',
                            !notification.read && 'font-medium'
                          )}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <span className="h-2 w-2 rounded-full bg-primary block" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-2 border-t border-border">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => navigate('/notifications')}
              >
                Zobacz wszystkie
              </Button>
            </div>
          </TabsContent>

          {/* ── Sovra Tab ── */}
          <TabsContent value="sovra" className="m-0">
            <SovraTabContent />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
