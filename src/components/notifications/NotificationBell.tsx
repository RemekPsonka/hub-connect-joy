import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Check
} from 'lucide-react';
import { useNotifications, getNotificationLink } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export const NotificationBell = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    isLoading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications(10);

  const getIcon = (type: string) => {
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
  };

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
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Powiadomienia</h4>
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

        {/* Notifications list */}
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
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full p-3 text-left hover:bg-muted/50 transition-colors flex gap-3",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      !notification.read && "font-medium"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { 
                        addSuffix: true, 
                        locale: pl 
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

        {/* Footer */}
        <div className="p-2 border-t">
          <Button 
            variant="ghost" 
            className="w-full text-sm"
            onClick={() => navigate('/notifications')}
          >
            Zobacz wszystkie
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
