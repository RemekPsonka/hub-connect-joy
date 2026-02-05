import { useState } from 'react';
import { Calendar, Clock, ChevronDown, ChevronUp, MessageSquare, UserPlus, Brain, GitMerge, RefreshCw, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContactConsultations, useContactActivityLog } from '@/hooks/useContacts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ContactHistoryTabProps {
  contactId: string;
}

const statusLabels: Record<string, string> = {
  scheduled: 'Zaplanowana',
  completed: 'Zakończona',
  cancelled: 'Anulowana',
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-500',
};

const activityTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  created: { icon: UserPlus, label: 'Kontakt dodany', color: 'text-green-500' },
  ai_profile_generated: { icon: Brain, label: 'Profil AI wygenerowany', color: 'text-purple-500' },
  ai_agent_initialized: { icon: Brain, label: 'Agent AI zainicjalizowany', color: 'text-indigo-500' },
  merged: { icon: GitMerge, label: 'Kontakt scalony', color: 'text-orange-500' },
  updated: { icon: Edit, label: 'Kontakt zaktualizowany', color: 'text-blue-500' },
  refreshed: { icon: RefreshCw, label: 'Dane odświeżone', color: 'text-cyan-500' },
};

export function ContactHistoryTab({ contactId }: ContactHistoryTabProps) {
  const { data: consultations = [], isLoading: isLoadingConsultations } = useContactConsultations(contactId);
  const { data: activityLog = [], isLoading: isLoadingActivity } = useContactActivityLog(contactId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isLoading = isLoadingConsultations || isLoadingActivity;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  // Combine and sort all events
  const allEvents = [
    ...activityLog.map(activity => ({
      id: activity.id,
      type: 'activity' as const,
      date: new Date(activity.created_at),
      data: activity,
    })),
    ...consultations.map(consultation => ({
      id: consultation.id,
      type: 'consultation' as const,
      date: new Date(consultation.scheduled_at),
      data: consultation,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (allEvents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Brak historii aktywności</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Oś czasu kontaktu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {allEvents.map((event, index) => {
            if (event.type === 'activity') {
              const activity = event.data;
              const config = activityTypeConfig[activity.activity_type] || {
                icon: Calendar,
                label: activity.activity_type,
                color: 'text-muted-foreground',
              };
              const Icon = config.icon;
              const metadata = activity.metadata as Record<string, unknown> | null;

              return (
                <div key={event.id} className="relative pl-10 pb-6">
                  {/* Timeline dot */}
                  <div className={`absolute left-2 w-5 h-5 rounded-full bg-background border-2 border-current flex items-center justify-center ${config.color}`}>
                    <Icon className="h-3 w-3" />
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${config.color}`}>{config.label}</span>
                        {metadata?.migrated ? (
                          <Badge variant="outline" className="text-xs">migracja</Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(event.date, 'dd MMM yyyy, HH:mm', { locale: pl })}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                    )}
                    {metadata?.source ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Źródło: {String(metadata.source)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            }

            // Consultation event
            const consultation = event.data;
            return (
              <div key={event.id} className="relative pl-10 pb-6">
                {/* Timeline dot */}
                <div className="absolute left-2 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                  <MessageSquare className="h-3 w-3 text-primary" />
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setExpandedId(expandedId === consultation.id ? null : consultation.id)
                    }
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-primary">Konsultacja</span>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(event.date, 'dd MMM yyyy, HH:mm', { locale: pl })}
                        </span>
                      </div>
                      {consultation.duration_minutes && (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Clock className="h-3 w-3" />
                          <span>{consultation.duration_minutes} min</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${statusColors[consultation.status || 'scheduled']} text-white border-0`}
                      >
                        {statusLabels[consultation.status || 'scheduled']}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        {expandedId === consultation.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {expandedId === consultation.id && (
                    <div className="px-3 pb-3 pt-0 border-t bg-muted/30">
                      {consultation.preparation_brief && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Brief przygotowawczy
                          </p>
                          <p className="text-sm">{consultation.preparation_brief}</p>
                        </div>
                      )}
                      {consultation.notes && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Notatki
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{consultation.notes}</p>
                        </div>
                      )}
                      {consultation.ai_summary && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Podsumowanie AI
                          </p>
                          <p className="text-sm">{consultation.ai_summary}</p>
                        </div>
                      )}
                      {!consultation.preparation_brief &&
                        !consultation.notes &&
                        !consultation.ai_summary && (
                          <p className="text-sm text-muted-foreground mt-3">
                            Brak dodatkowych informacji
                          </p>
                        )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
