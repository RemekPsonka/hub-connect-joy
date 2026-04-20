// TODO: rozszerzyć o gcal_events filtered po attendees jsonb (email kontaktu).
// Obecnie pokazuje tylko consultation_meetings via consultation_guests — niepełne źródło.
// Większość spotkań Remka leci przez Google Calendar.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { SectionShell } from './SectionShell';

interface Props {
  contactId: string;
  enabled: boolean;
}

export function SectionMeetings({ contactId, enabled }: Props) {
  const query = useQuery({
    queryKey: ['contact-v2-section', 'meetings', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultation_meetings')
        .select('id, meeting_type, meeting_date, comment, follow_up')
        .eq('contact_id', contactId)
        .order('meeting_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled,
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <SectionShell
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      refetch={query.refetch}
      isEmpty={!query.data || query.data.length === 0}
      emptyMessage="Brak konsultacji powiązanych z kontaktem (spotkania z kalendarza Google trafią tu w kolejnym sprincie)"
    >
      <div className="divide-y">
        {query.data?.map((m) => (
          <div key={m.id} className="py-2 text-sm flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{m.meeting_type}</div>
              <div className="text-xs text-muted-foreground">
                {m.meeting_date && new Date(m.meeting_date).toLocaleDateString('pl-PL')}
                {m.comment && <> · {m.comment}</>}
              </div>
            </div>
            {m.meeting_date && (
              <Badge variant={m.meeting_date >= today ? 'default' : 'secondary'}>
                {m.meeting_date >= today ? 'Przyszłe' : 'Minione'}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
