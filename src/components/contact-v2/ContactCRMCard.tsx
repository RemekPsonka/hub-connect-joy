import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Zap, CheckSquare, Clock, Tag, User, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PushToSGUDialog } from '@/components/sgu/PushToSGUDialog';

interface ContactCRMCardProps {
  contactId: string;
}

function Section({ icon: Icon, title, children }: { icon: typeof Wallet; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function fmtPLN(gr: number | null | undefined) {
  if (!gr) return '0 PLN';
  return `${(Number(gr) / 100).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN`;
}

export function ContactCRMCard({ contactId }: ContactCRMCardProps) {
  const { sguTeamId } = useSGUTeamId();
  const [sguOpen, setSguOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contact-crm-card', contactId],
    queryFn: async () => {
      const [contactRes, dealsRes, tasksRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('id, full_name, last_contact_date, director_id, primary_group_id, contact_groups:primary_group_id(name, color), directors:director_id(full_name)')
          .eq('id', contactId)
          .maybeSingle(),
        supabase
          .from('deal_team_contacts')
          .select('id, team_id, category, deal_stage, status, is_lost, snoozed_until, expected_annual_premium_gr, updated_at')
          .eq('contact_id', contactId),
        supabase
          .from('tasks')
          .select('id, title, due_date, status')
          .eq('contact_id', contactId)
          .neq('status', 'done')
          .order('due_date', { ascending: true })
          .limit(3),
      ]);
      return {
        contact: contactRes.data,
        deals: dealsRes.data ?? [],
        tasks: tasksRes.data ?? [],
      };
    },
    enabled: !!contactId,
  });

  const sguDeal = useMemo(
    () => data?.deals.find((d) => sguTeamId && d.team_id === sguTeamId) ?? null,
    [data, sguTeamId],
  );

  const otherDeals = useMemo(
    () => (data?.deals ?? []).filter((d) => !sguTeamId || d.team_id !== sguTeamId),
    [data, sguTeamId],
  );

  const daysSinceContact = data?.contact?.last_contact_date
    ? Math.floor((Date.now() - new Date(data.contact.last_contact_date).getTime()) / 86400000)
    : null;

  const nextTask = data?.tasks[0];

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  const ownerName = (data?.contact as unknown as { directors?: { full_name?: string } } | null)?.directors?.full_name;
  const group = (data?.contact as unknown as { contact_groups?: { name?: string; color?: string } } | null)
    ?.contact_groups;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-5">
      <Section icon={Wallet} title="Aktywny deal">
        {otherDeals.length === 0 ? (
          <Button variant="outline" size="sm" className="w-full">
            + Utwórz deal
          </Button>
        ) : (
          <ul className="space-y-1.5">
            {otherDeals.map((d) => (
              <li key={d.id} className="flex justify-between text-sm">
                <span className="truncate">{d.category ?? '—'}</span>
                <span className="font-medium">{fmtPLN(d.expected_annual_premium_gr)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={Zap} title="Next action">
        {nextTask ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{nextTask.title}</span>
            <Button size="sm" variant="secondary">Wykonaj</Button>
          </div>
        ) : (
          <span className="text-muted-foreground">Brak zaplanowanej akcji</span>
        )}
      </Section>

      <Section icon={CheckSquare} title="Zadania">
        {data?.tasks.length ? (
          <ul className="space-y-1">
            {data.tasks.map((t) => (
              <li key={t.id} className="text-sm truncate">• {t.title}</li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">Brak otwartych zadań</span>
        )}
      </Section>

      <Section icon={Clock} title="Ostatni kontakt">
        {daysSinceContact !== null ? `${daysSinceContact} dni temu` : 'Brak danych'}
      </Section>

      <Section icon={Tag} title="Tagi">
        {group?.name ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: `${group.color ?? 'hsl(var(--muted))'}20`, color: group.color ?? undefined }}
          >
            {group.name}
          </span>
        ) : (
          <span className="text-muted-foreground">Brak grupy</span>
        )}
      </Section>

      <Section icon={User} title="Właściciel">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">{ownerName?.[0] ?? '?'}</AvatarFallback>
          </Avatar>
          <span>{ownerName ?? 'Nieprzypisany'}</span>
        </div>
      </Section>

      <Section icon={Star} title="SGU">
        {sguDeal ? (
          <SGUDealBadge deal={sguDeal} />
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setSguOpen(true)}>
            ⭐ Przekaż do lejka
          </Button>
        )}
      </Section>

      <PushToSGUDialog
        open={sguOpen}
        onOpenChange={setSguOpen}
        contactId={contactId}
        contactName={data?.contact?.full_name ?? ''}
      />
    </div>
  );
}
