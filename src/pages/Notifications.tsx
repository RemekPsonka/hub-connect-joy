import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bell, 
  Calendar, 
  AlertCircle, 
  Link, 
  HeartCrack, 
  Lightbulb,
  Check,
  Trash2,
  Filter
} from 'lucide-react';
import { useNotifications, getNotificationLink, Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const { 
    notifications, 
    isLoading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    deleteNotification
  } = useNotifications(100);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'consultation_reminder':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'task_overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'new_match':
        return <Link className="h-5 w-5 text-green-500" />;
      case 'relationship_decay':
        return <HeartCrack className="h-5 w-5 text-orange-500" />;
      case 'serendipity':
        return <Lightbulb className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'consultation_reminder':
        return 'Spotkanie';
      case 'task_overdue':
        return 'Zaległe zadanie';
      case 'new_match':
        return 'Dopasowanie';
      case 'relationship_decay':
        return 'Relacja';
      case 'serendipity':
        return 'Odkrycie';
      default:
        return 'Inne';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'normal':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'low':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    const link = getNotificationLink(notification);
    navigate(link);
  };

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = format(new Date(notification.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Dzisiaj';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Wczoraj';
    }
    return format(date, 'd MMMM yyyy', { locale: pl });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Powiadomienia</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `${unreadCount} nieprzeczytanych powiadomień` 
              : 'Wszystkie powiadomienia przeczytane'}
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button onClick={() => markAllAsRead()}>
            <Check className="h-4 w-4 mr-2" />
            Oznacz wszystkie jako przeczytane
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtruj" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="unread">Nieprzeczytane</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Typ powiadomienia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            <SelectItem value="consultation_reminder">Spotkania</SelectItem>
            <SelectItem value="task_overdue">Zaległe zadania</SelectItem>
            <SelectItem value="new_match">Dopasowania</SelectItem>
            <SelectItem value="relationship_decay">Relacje</SelectItem>
            <SelectItem value="serendipity">Odkrycia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Ładowanie powiadomień...</p>
          </CardContent>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Brak powiadomień</h3>
            <p className="text-muted-foreground">
              {filter === 'unread' 
                ? 'Wszystkie powiadomienia zostały przeczytane' 
                : 'Nie masz jeszcze żadnych powiadomień'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {formatGroupDate(date)}
              </h3>
              <Card>
                <CardContent className="p-0 divide-y">
                  {dateNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 flex gap-4 hover:bg-muted/50 transition-colors cursor-pointer",
                        !notification.read && "bg-primary/5"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={cn(
                            "text-sm",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <Badge variant="outline" className={cn("text-xs", getPriorityColor(notification.priority))}>
                            {getTypeLabel(notification.type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: pl 
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
