import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { MeetingStatusBadge } from './MeetingStatusBadge';
import type { GroupMeeting } from '@/hooks/useMeetings';
import { useNavigate } from 'react-router-dom';

interface MeetingCardProps {
  meeting: GroupMeeting;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/meetings/${meeting.id}`);
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground truncate">{meeting.name}</h3>
              <MeetingStatusBadge status={meeting.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {format(new Date(meeting.scheduled_at), 'd MMMM yyyy, HH:mm', { locale: pl })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{meeting.duration_minutes} min</span>
              </div>

              {(meeting.location || meeting.city) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {[meeting.location, meeting.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>
                  {meeting.actual_participant_count ?? meeting.expected_participant_count ?? 0} uczestników
                </span>
              </div>
            </div>

            {meeting.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {meeting.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
