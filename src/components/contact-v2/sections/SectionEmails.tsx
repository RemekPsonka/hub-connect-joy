// TODO: trigram GIN index on gmail_messages(from, to) — performance dla większych tenantów.
// Obecnie ILIKE '%email%' = full scan, OK dla 1-2 tenantów.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { SectionShell } from './SectionShell';

interface Props {
  contactEmail: string | null;
  enabled: boolean;
}

export function SectionEmails({ contactEmail, enabled }: Props) {
  const query = useQuery({
    queryKey: ['contact-v2-section', 'emails', contactEmail],
    queryFn: async () => {
      if (!contactEmail) return [];
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('gmail_messages')
        .select('id, from, to, subject, body_plain, date')
        .or(`from.ilike.%${contactEmail}%,to.ilike.%${contactEmail}%`)
        .order('date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((m) => ({
        ...m,
        direction: (m.from ?? '').toLowerCase().includes(contactEmail.toLowerCase()) ? 'in' : 'out',
        userId: user?.id,
      }));
    },
    enabled: enabled && !!contactEmail,
  });

  return (
    <SectionShell
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      refetch={query.refetch}
      isEmpty={!query.data || query.data.length === 0}
      emptyMessage={!contactEmail ? 'Kontakt nie ma maila — nie można wyszukać korespondencji' : 'Brak maili z tym kontaktem'}
    >
      <div className="divide-y">
        {query.data?.map((m) => (
          <div key={m.id} className="py-2 text-sm flex gap-2">
            {m.direction === 'in' ? (
              <ArrowDownLeft className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            ) : (
              <ArrowUpRight className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{m.subject ?? '(bez tematu)'}</div>
              <div className="text-xs text-muted-foreground">
                {m.date && new Date(m.date).toLocaleString('pl-PL')}
              </div>
              {m.body_plain && (
                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {m.body_plain.slice(0, 200)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
