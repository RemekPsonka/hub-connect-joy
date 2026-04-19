import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, MapPin, UsersRound, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { UnifiedMeeting } from '@/hooks/useUnifiedMeetings';

interface UnifiedMeetingsListProps {
  meetings: UnifiedMeeting[];
  isLoading?: boolean;
  emptyText?: string;
}

export function UnifiedMeetingsList({ meetings, isLoading, emptyText }: UnifiedMeetingsListProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{emptyText ?? 'Brak spotkań do wyświetlenia.'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((m) => {
        const route = m.type === 'consultation' ? `/consultations/${m.id}` : `/meetings/${m.id}`;
        const Icon = m.type === 'consultation' ? MessageSquare : UsersRound;
        return (
          <Card
            key={`${m.source_table}-${m.id}`}
            onClick={() => navigate(route)}
            className="cursor-pointer transition-colors hover:bg-accent/50"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={m.type === 'consultation' ? 'secondary' : 'default'}>
                        {m.type === 'consultation' ? 'Konsultacja' : 'Spotkanie grupowe'}
                      </Badge>
                      {m.status && (
                        <Badge variant="outline" className="text-xs">
                          {m.status}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-foreground">
                      {format(new Date(m.scheduled_at), 'dd.MM.yyyy, HH:mm', { locale: pl })}
                      {m.duration ? ` · ${m.duration} min` : ''}
                    </div>
                    {m.location && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{m.location}</span>
                      </div>
                    )}
                    {m.notes && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{m.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
