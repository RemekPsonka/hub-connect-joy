import { Calendar, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useLinkedEvents } from '@/hooks/useGCalLinks';
import { useGCalConnection } from '@/hooks/useGoogleCalendar';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface TaskLinkedMeetingsProps {
  taskId: string;
}

export function TaskLinkedMeetings({ taskId }: TaskLinkedMeetingsProps) {
  const { isConnected, isLoading: isLoadingConnection } = useGCalConnection();
  const { data: linkedEvents = [], isLoading: isLoadingLinks } = useLinkedEvents('task', taskId);

  // Don't render anything if GCal not connected
  if (isLoadingConnection || !isConnected) return null;

  const isLoading = isLoadingLinks;

  return (
    <>
      <Separator />
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Spotkania z kalendarza
        </h4>

        {isLoading ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : linkedEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Brak powiązanych spotkań
          </p>
        ) : (
          <div className="space-y-1.5">
            {linkedEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm"
              >
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.created_at), 'd MMM yyyy', { locale: pl })}
                  </p>
                  <p className="text-xs truncate">{event.gcal_event_id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
