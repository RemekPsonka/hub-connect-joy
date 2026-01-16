import { MeetingCard } from './MeetingCard';
import { Card, CardContent } from '@/components/ui/card';
import { UsersRound } from 'lucide-react';
import type { GroupMeeting, MeetingsFilter } from '@/hooks/useMeetings';

interface MeetingsListProps {
  meetings: GroupMeeting[];
  filter: MeetingsFilter;
  isLoading?: boolean;
}

export function MeetingsList({ meetings, filter, isLoading }: MeetingsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-6 bg-muted rounded w-1/3 mb-3" />
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UsersRound className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Brak spotkań grupowych</h3>
          <p className="text-sm text-muted-foreground text-center">
            {filter === 'upcoming'
              ? 'Nie masz zaplanowanych nadchodzących spotkań.'
              : filter === 'past'
                ? 'Nie masz poprzednich spotkań.'
                : 'Dodaj swoje pierwsze spotkanie grupowe.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group meetings by upcoming/past for 'all' filter
  if (filter === 'all') {
    const now = new Date();
    const upcoming = meetings.filter((m) => new Date(m.scheduled_at) >= now);
    const past = meetings.filter((m) => new Date(m.scheduled_at) < now);

    return (
      <div className="space-y-8">
        {upcoming.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Nadchodzące</h2>
            <div className="space-y-4">
              {upcoming.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Poprzednie</h2>
            <div className="space-y-4">
              {past.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </div>
  );
}
