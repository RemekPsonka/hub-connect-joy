import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Video, Plus, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConsultationStatusBadge } from '@/components/consultations/ConsultationStatusBadge';
import { ConsultationModal } from '@/components/consultations/ConsultationModal';
import { useContactConsultationsHistory } from '@/hooks/useConsultations';

interface ContactConsultationsTabProps {
  contactId: string;
  contactName: string;
}

export function ContactConsultationsTab({ contactId, contactName }: ContactConsultationsTabProps) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: consultations = [], isLoading } = useContactConsultationsHistory(contactId);

  const stats = useMemo(() => {
    if (!consultations.length) {
      return {
        total: 0,
        completed: 0,
        scheduled: 0,
        avgDuration: 0,
        lastDate: null,
        nextDate: null,
      };
    }

    const now = new Date();
    const completed = consultations.filter(c => c.status === 'completed');
    const scheduled = consultations.filter(c => c.status === 'scheduled');
    
    const totalDuration = consultations.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
    const avgDuration = Math.round(totalDuration / consultations.length);

    const pastConsultations = consultations
      .filter(c => new Date(c.scheduled_at) < now)
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    
    const futureConsultations = consultations
      .filter(c => new Date(c.scheduled_at) >= now && c.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    return {
      total: consultations.length,
      completed: completed.length,
      scheduled: scheduled.length,
      avgDuration,
      lastDate: pastConsultations[0]?.scheduled_at || null,
      nextDate: futureConsultations[0]?.scheduled_at || null,
    };
  }, [consultations]);

  const sortedConsultations = useMemo(() => {
    return [...consultations].sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    );
  }, [consultations]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Podsumowanie konsultacji</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Łącznie</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Zakończone</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
              <div className="text-xs text-muted-foreground">Zaplanowane</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.avgDuration || '-'}</div>
              <div className="text-xs text-muted-foreground">Śr. czas (min)</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Ostatnia:</span>
              <span className="font-medium">
                {stats.lastDate
                  ? format(new Date(stats.lastDate), 'd MMM yyyy', { locale: pl })
                  : 'Brak'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Następna:</span>
              <span className="font-medium">
                {stats.nextDate
                  ? format(new Date(stats.nextDate), 'd MMM yyyy', { locale: pl })
                  : 'Brak'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consultations List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lista konsultacji</CardTitle>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nowa konsultacja
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedConsultations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Brak konsultacji z tym kontaktem</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Zaplanuj pierwszą konsultację
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedConsultations.map((consultation) => (
                <div
                  key={consultation.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/consultations/${consultation.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(consultation.scheduled_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{consultation.duration_minutes || 60} min</span>
                        </div>
                        <ConsultationStatusBadge status={consultation.status || 'scheduled'} />
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {consultation.is_virtual ? (
                          <>
                            <Video className="h-4 w-4" />
                            <span>Spotkanie online</span>
                            {consultation.meeting_url && (
                              <a
                                href={consultation.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Link <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </>
                        ) : consultation.location ? (
                          <>
                            <MapPin className="h-4 w-4" />
                            <span>{consultation.location}</span>
                          </>
                        ) : (
                          <span className="italic">Lokalizacja nie określona</span>
                        )}
                      </div>

                      {consultation.status === 'completed' && consultation.notes && (
                        <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          📝 {consultation.notes}
                        </div>
                      )}
                    </div>

                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConsultationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        prefilledContactId={contactId}
      />
    </div>
  );
}
