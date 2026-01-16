import { useState } from 'react';
import { Calendar, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContactConsultations } from '@/hooks/useContacts';
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

export function ContactHistoryTab({ contactId }: ContactHistoryTabProps) {
  const { data: consultations = [], isLoading } = useContactConsultations(contactId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (consultations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Brak historii konsultacji</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historia konsultacji</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {consultations.map((consultation) => (
          <div
            key={consultation.id}
            className="border rounded-lg overflow-hidden"
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
              onClick={() =>
                setExpandedId(expandedId === consultation.id ? null : consultation.id)
              }
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(consultation.scheduled_at), 'dd MMM yyyy, HH:mm', {
                      locale: pl,
                    })}
                  </span>
                </div>
                {consultation.duration_minutes && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
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
              <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                {consultation.preparation_brief && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Brief przygotowawczy
                    </p>
                    <p className="text-sm">{consultation.preparation_brief}</p>
                  </div>
                )}
                {consultation.notes && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Notatki
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{consultation.notes}</p>
                  </div>
                )}
                {consultation.ai_summary && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Podsumowanie AI
                    </p>
                    <p className="text-sm">{consultation.ai_summary}</p>
                  </div>
                )}
                {!consultation.preparation_brief &&
                  !consultation.notes &&
                  !consultation.ai_summary && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Brak dodatkowych informacji
                    </p>
                  )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
