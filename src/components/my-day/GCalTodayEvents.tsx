import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { format, differenceInMinutes, parseISO, isWithinInterval } from 'date-fns';
import { DataCard } from '@/components/ui/data-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useGCalConnection, useGCalEvents } from '@/hooks/useGoogleCalendar';
import { CalendarEventPopover } from '@/components/calendar/CalendarEventPopover';
import { gcalToItem } from '@/hooks/useCalendarData';
import { cn } from '@/lib/utils';

function formatDuration(startStr: string, endStr: string): string {
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isEventNow(event: { start: { dateTime?: string }; end: { dateTime?: string } }, now: Date): boolean {
  if (!event.start.dateTime || !event.end.dateTime) return false;
  return isWithinInterval(now, {
    start: parseISO(event.start.dateTime),
    end: parseISO(event.end.dateTime),
  });
}

export function GCalTodayEvents() {
  const navigate = useNavigate();
  const { isConnected, isLoading: isLoadingConnection } = useGCalConnection();
  const [now, setNow] = useState(new Date());

  // Update "now" every minute for live NOW badge
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const { data: events = [], isLoading: isLoadingEvents } = useGCalEvents(todayStart, todayEnd, isConnected);

  if (isLoadingConnection) {
    return (
      <DataCard title="Spotkania dziś">
        <Skeleton className="h-16 w-full" />
      </DataCard>
    );
  }

  if (!isConnected) {
    return (
      <DataCard title="Spotkania dziś">
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm font-medium mb-1">Połącz kalendarz</p>
          <p className="text-xs text-muted-foreground mb-3">
            Synchronizuj spotkania z Google Calendar
          </p>
          <button
            onClick={() => navigate('/settings?tab=integrations')}
            className="text-xs text-primary hover:underline"
          >
            Połącz w ustawieniach →
          </button>
        </div>
      </DataCard>
    );
  }

  if (isLoadingEvents) {
    return (
      <DataCard
        title="Spotkania dziś"
        action={<Badge variant="secondary" className="text-xs">...</Badge>}
      >
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </DataCard>
    );
  }

  return (
    <DataCard
      title="Spotkania dziś"
      action={
        events.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {events.length}
          </Badge>
        ) : null
      }
    >
      {events.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm font-medium">Spokojny dzień!</p>
          <p className="text-xs text-muted-foreground">Brak zaplanowanych spotkań</p>
        </div>
      ) : (
        <div className="relative pl-6">
          {events.map((event, index) => {
            const startTime = event.start.dateTime
              ? format(parseISO(event.start.dateTime), 'HH:mm')
              : 'Cały dzień';
            const duration =
              event.start.dateTime && event.end.dateTime
                ? formatDuration(event.start.dateTime, event.end.dateTime)
                : null;
            const happening = isEventNow(event, now);
            const isLast = index === events.length - 1;
            const calendarItem = gcalToItem(event);

            return (
              <div key={event.id} className="relative pb-3 last:pb-0">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-border" />
                )}

                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-0 top-1.5 w-[16px] h-[16px] rounded-full border-2 border-background shadow-sm shrink-0',
                    happening && 'ring-2 ring-primary/40 animate-pulse'
                  )}
                  style={{ backgroundColor: event.color }}
                />

                {/* Event content */}
                <CalendarEventPopover item={calendarItem}>
                  <button className="w-full text-left pl-4 cursor-pointer hover:bg-muted/30 rounded-lg py-1 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">
                        {startTime}
                      </span>
                      <p className="text-sm font-medium truncate flex-1">{event.summary}</p>
                      {happening && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-0 shrink-0">
                          TERAZ
                        </Badge>
                      )}
                      {duration && !happening && (
                        <span className="text-xs text-muted-foreground shrink-0">{duration}</span>
                      )}
                    </div>
                    {event.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate ml-12 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {event.location}
                      </p>
                    )}
                  </button>
                </CalendarEventPopover>
              </div>
            );
          })}
        </div>
      )}
    </DataCard>
  );
}
