import { useMemo, useState } from 'react';
import { format, isPast, parseISO, addMonths, startOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Briefcase, CheckCircle2, Clock, DollarSign,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { useTeamPaymentSchedule } from '@/hooks/usePaymentSchedule';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OfferingKanbanBoard } from './offering/OfferingKanbanBoard';
import { OfferingContactCard } from './offering/OfferingContactCard';
import type { DealTeamContact } from '@/types/dealTeam';

interface OfferingTabProps {
  teamId: string;
}

export function OfferingTab({ teamId }: OfferingTabProps) {
  const { data: contacts = [], isLoading: contactsLoading } = useTeamContacts(teamId);
  const { data: payments = [], isLoading: paymentsLoading } = useTeamPaymentSchedule(teamId);
  const [expandedContact, setExpandedContact] = useState<DealTeamContact | null>(null);

  const offeringContacts = useMemo(
    () => contacts.filter((c) => c.category === 'offering'),
    [contacts]
  );

  const totalScheduled = useMemo(
    () => payments.reduce((s, p) => s + p.amount, 0),
    [payments]
  );
  const totalPaid = useMemo(
    () => payments.filter(p => p.is_paid).reduce((s, p) => s + p.amount, 0),
    [payments]
  );
  const upcomingPayments = useMemo(
    () => payments.filter(p => !p.is_paid && !isPast(parseISO(p.scheduled_date))).length,
    [payments]
  );

  // Payment timeline chart data (24 months)
  const timelineData = useMemo(() => {
    const now = startOfMonth(new Date());
    const months = Array.from({ length: 24 }, (_, i) => {
      const d = addMonths(now, i);
      return {
        month: format(d, 'LLL yy', { locale: pl }),
        recurring: 0,
        one_time: 0,
        lump_sum: 0,
      };
    });
    payments.forEach((p) => {
      const pDate = startOfMonth(parseISO(p.scheduled_date));
      const diff = Math.round((pDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      if (diff >= 0 && diff < 24) {
        months[diff][p.payment_type] += p.amount;
      }
    });
    return months;
  }, [payments]);

  const timelineChartConfig: ChartConfig = {
    recurring: { label: 'Cykliczne', color: '#3b82f6' },
    one_time: { label: 'Jednorazowe', color: '#8b5cf6' },
    lump_sum: { label: 'Dodatkowe', color: '#eab308' },
  };

  if (contactsLoading || paymentsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment timeline chart */}
      {payments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline płatności (24 miesiące)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={timelineChartConfig} className="h-[220px] w-full aspect-auto">
              <AreaChart data={timelineData} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="recurring" stackId="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="one_time" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="lump_sum" stackId="1" fill="#eab308" stroke="#eab308" fillOpacity={0.6} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Briefcase className="h-4 w-4" />
              W ofertowaniu
            </div>
            <p className="text-2xl font-bold">{offeringContacts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Zaplanowane
            </div>
            <p className="text-2xl font-bold">{formatCompactCurrency(totalScheduled)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Opłacone
            </div>
            <p className="text-2xl font-bold">{formatCompactCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Nadchodzące
            </div>
            <p className="text-2xl font-bold">{upcomingPayments}</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      {offeringContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">Brak kontaktów w ofertowaniu</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Przenieś kontakt do kolumny OFERTOWANIE na Kanbanie, aby rozpocząć proces ofertowania.
          </p>
        </div>
      ) : (
        <OfferingKanbanBoard
          contacts={offeringContacts}
          payments={payments}
          teamId={teamId}
          onContactClick={setExpandedContact}
        />
      )}

      {/* Expanded contact details */}
      {expandedContact && (
        <OfferingContactCard
          contact={expandedContact}
          teamId={teamId}
          payments={payments.filter(p => p.team_contact_id === expandedContact.id)}
          onClose={() => setExpandedContact(null)}
        />
      )}
    </div>
  );
}
