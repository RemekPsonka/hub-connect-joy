import { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Clock, Video, MapPin } from 'lucide-react';
import { ConsultationWithContact } from '@/hooks/useConsultations';
import { ConsultationStatusBadge } from './ConsultationStatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ConsultationsCalendarProps {
  consultations: ConsultationWithContact[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ConsultationsCalendar({ consultations }: ConsultationsCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const navigate = useNavigate();

  // Get days that have consultations
  const consultationDays = consultations.map((c) => new Date(c.scheduled_at));

  // Filter consultations for selected day
  const selectedDayConsultations = selectedDay
    ? consultations.filter((c) => isSameDay(new Date(c.scheduled_at), selectedDay))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardContent className="p-4">
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            locale={pl}
            modifiers={{
              hasConsultation: consultationDays,
            }}
            modifiersStyles={{
              hasConsultation: {
                fontWeight: 'bold',
                textDecoration: 'underline',
                textDecorationColor: 'hsl(var(--primary))',
              },
            }}
            className="flex justify-center"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {selectedDay
              ? format(selectedDay, 'd MMMM yyyy', { locale: pl })
              : 'Wybierz dzień'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDayConsultations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Brak konsultacji w tym dniu
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {selectedDayConsultations.map((consultation) => {
                  const contact = consultation.contacts;
                  return (
                    <div
                      key={consultation.id}
                      className="p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/consultations/${consultation.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(contact.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm truncate">
                              {contact.full_name}
                            </p>
                            <ConsultationStatusBadge
                              status={consultation.status || 'scheduled'}
                              className="text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(consultation.scheduled_at), 'HH:mm')}
                            </span>
                            {consultation.is_virtual ? (
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                Online
                              </span>
                            ) : consultation.location ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {consultation.location}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
