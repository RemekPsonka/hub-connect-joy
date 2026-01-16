import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Video, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ConsultationStatusBadge } from './ConsultationStatusBadge';
import { ConsultationWithContact } from '@/hooks/useConsultations';

interface ConsultationsListProps {
  consultations: ConsultationWithContact[];
  isLoading?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return 'Dzisiaj';
  if (isTomorrow(date)) return 'Jutro';
  return format(date, 'd MMMM yyyy', { locale: pl });
}

function ConsultationCard({ consultation }: { consultation: ConsultationWithContact }) {
  const navigate = useNavigate();
  const scheduledAt = new Date(consultation.scheduled_at);
  const contact = consultation.contacts;

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => navigate(`/consultations/${consultation.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(contact.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-foreground truncate">
                  {contact.full_name}
                </h3>
                {contact.company && (
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.company}
                  </p>
                )}
              </div>
              <ConsultationStatusBadge status={consultation.status || 'scheduled'} />
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDateLabel(scheduledAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>
                  {format(scheduledAt, 'HH:mm')} ({consultation.duration_minutes || 60} min)
                </span>
              </div>
              {consultation.is_virtual ? (
                <div className="flex items-center gap-1.5">
                  <Video className="h-4 w-4" />
                  <span>Online</span>
                </div>
              ) : consultation.location ? (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate max-w-[150px]">{consultation.location}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConsultationsList({ consultations, isLoading }: ConsultationsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-3 w-1/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (consultations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">Brak konsultacji</h3>
          <p className="text-sm text-muted-foreground">
            Zaplanuj pierwszą konsultację, aby rozpocząć.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate upcoming and past consultations
  const now = new Date();
  const upcoming = consultations.filter(
    (c) => new Date(c.scheduled_at) >= now && c.status === 'scheduled'
  );
  const past = consultations.filter(
    (c) => new Date(c.scheduled_at) < now || c.status !== 'scheduled'
  );

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Nadchodzące
          </h2>
          <div className="space-y-3">
            {upcoming.map((consultation) => (
              <ConsultationCard key={consultation.id} consultation={consultation} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Poprzednie</h2>
          <div className="space-y-3">
            {past.map((consultation) => (
              <ConsultationCard key={consultation.id} consultation={consultation} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
