import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users2, Calendar, ArrowRight, Plus, MapPin } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';
import { MeetingStatusBadge } from '@/components/meetings/MeetingStatusBadge';
import { MeetingModal } from '@/components/meetings/MeetingModal';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export function MeetingsOverview() {
  const navigate = useNavigate();
  const { data: meetings, isLoading } = useMeetings('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const upcomingMeetings = meetings?.slice(0, 3);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users2 className="h-4 w-4 text-primary" />
            Spotkania grupowe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users2 className="h-4 w-4 text-primary" />
              Spotkania grupowe
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-8 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Nowe
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!upcomingMeetings || upcomingMeetings.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Brak nadchodzących spotkań</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="mt-2"
              >
                Zaplanuj spotkanie
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <button
                  key={meeting.id}
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                  className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate mb-1">
                        {meeting.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(meeting.scheduled_at), 'd MMM', { locale: pl })}
                        </span>
                        {meeting.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{meeting.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <MeetingStatusBadge status={meeting.status} />
                  </div>
                </button>
              ))}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/meetings')}
                className="w-full mt-2 text-muted-foreground hover:text-foreground"
              >
                Zobacz wszystkie
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MeetingModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
