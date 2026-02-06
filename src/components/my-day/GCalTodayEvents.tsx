import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useGCalConnection, useGCalEvents } from '@/hooks/useGoogleCalendar';

function formatDuration(startStr: string, endStr: string): string {
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function GCalTodayEvents() {
  const navigate = useNavigate();
  const { isConnected, isLoading: isLoadingConnection } = useGCalConnection();

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
        <div>
          {events.map((event) => {
            const startTime = event.start.dateTime
              ? format(parseISO(event.start.dateTime), 'HH:mm')
              : 'Cały dzień';
            const duration =
              event.start.dateTime && event.end.dateTime
                ? formatDuration(event.start.dateTime, event.end.dateTime)
                : null;

            return (
              <div
                key={event.id}
                className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
              >
                <span className="text-xs font-mono text-muted-foreground w-14 shrink-0 text-right">
                  {startTime}
                </span>
                <span
                  className="w-1 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.summary}</p>
                  {event.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {event.location}
                    </p>
                  )}
                </div>
                {duration && (
                  <span className="text-xs text-muted-foreground shrink-0">{duration}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DataCard>
  );
}
