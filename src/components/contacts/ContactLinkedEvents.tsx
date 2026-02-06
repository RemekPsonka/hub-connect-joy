import { Calendar, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useLinkedEvents } from '@/hooks/useGCalLinks';
import { format, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContactLinkedEventsProps {
  contactId: string;
}

export function ContactLinkedEvents({ contactId }: ContactLinkedEventsProps) {
  const { data: linkedEvents = [], isLoading } = useLinkedEvents('contact', contactId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (linkedEvents.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Brak powiązanych spotkań"
        description="Powiąż spotkania z Google Calendar z tym kontaktem w widoku kalendarza."
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {linkedEvents.map((event) => {
        const eventDate = new Date(event.created_at);
        const past = isPast(eventDate);

        return (
          <div
            key={event.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border',
              past ? 'text-muted-foreground' : 'text-foreground font-medium'
            )}
          >
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">
                Spotkanie ({event.gcal_calendar_id})
              </p>
              <p className="text-xs text-muted-foreground">
                Powiązano: {format(eventDate, 'd MMM yyyy, HH:mm', { locale: pl })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
