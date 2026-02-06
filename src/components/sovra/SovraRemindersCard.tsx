import { useNavigate } from 'react-router-dom';
import { Clock, FolderOpen, Users, ArrowRight, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { DataCard } from '@/components/ui/data-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useUnreadReminders,
  useMarkReminderRead,
  useTriggerReminders,
  getReminderLink,
  type SovraReminder,
} from '@/hooks/useSovraReminders';
import { cn } from '@/lib/utils';

function getReminderIcon(type: string) {
  switch (type) {
    case 'deadline':
    case 'overdue':
      return <Clock className="h-4 w-4 text-red-500" />;
    case 'inactive_project':
      return <FolderOpen className="h-4 w-4 text-amber-500" />;
    case 'contact':
      return <Users className="h-4 w-4 text-blue-500" />;
    case 'follow_up':
      return <ArrowRight className="h-4 w-4 text-emerald-500" />;
    default:
      return <Sparkles className="h-4 w-4 text-primary" />;
  }
}

export function SovraRemindersCard() {
  const navigate = useNavigate();
  const { reminders, count, isLoading } = useUnreadReminders();
  const markRead = useMarkReminderRead();
  const trigger = useTriggerReminders();

  const visible = reminders.slice(0, 5);

  const handleClick = (reminder: SovraReminder) => {
    markRead.mutate(reminder.id);
    navigate(getReminderLink(reminder));
  };

  return (
    <DataCard
      title="Przypomnienia Sovry"
      action={
        count > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        ) : null
      }
      footer={
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
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : count === 0 ? (
        <div className="text-center py-6">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm font-medium">Wszystko pod kontrolą</p>
          <p className="text-xs text-muted-foreground">
            Sovra sprawdza Twoje projekty i zadania
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {visible.map((reminder) => (
            <button
              key={reminder.id}
              onClick={() => handleClick(reminder)}
              className={cn(
                'flex items-center gap-3 w-full text-left py-2.5 px-2 rounded-lg hover:bg-muted/30 transition-colors',
                reminder.priority === 'high' && 'border-l-2 border-l-destructive -ml-[2px]'
              )}
            >
              <div className="shrink-0">{getReminderIcon(reminder.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{reminder.message}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reminder.scheduled_at), {
                      addSuffix: true,
                      locale: pl,
                    })}
                  </span>
                  {reminder.priority === 'high' && (
                    <span className="text-[10px] text-destructive font-medium">⚡ Pilne</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </DataCard>
  );
}
