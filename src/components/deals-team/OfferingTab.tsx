import { useMemo, useState } from 'react';
import { isPast, parseISO } from 'date-fns';
import {
  Briefcase, CheckCircle2, Clock, DollarSign,
} from 'lucide-react';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { useTeamPaymentSchedule } from '@/hooks/usePaymentSchedule';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { Card, CardContent } from '@/components/ui/card';
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

  if (contactsLoading || paymentsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">

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
