import { useMemo, useState } from 'react';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Briefcase, CalendarDays, DollarSign, Plus, Trash2, CheckCircle2,
  Clock, Building2, ArrowRight,
} from 'lucide-react';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { useTeamPaymentSchedule, useAddPayment, useDeletePayment, useMarkPaymentPaid, type PaymentScheduleEntry } from '@/hooks/usePaymentSchedule';
import { useClientProducts } from '@/hooks/useTeamClients';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { DealTeamContact } from '@/types/dealTeam';

interface OfferingTabProps {
  teamId: string;
}

export function OfferingTab({ teamId }: OfferingTabProps) {
  const { data: contacts = [], isLoading: contactsLoading } = useTeamContacts(teamId);
  const { data: payments = [], isLoading: paymentsLoading } = useTeamPaymentSchedule(teamId);

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
      {/* Stats */}
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

      {/* Offering contacts */}
      {offeringContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">Brak kontaktów w ofertowaniu</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Przenieś kontakt do kolumny OFERTOWANIE na Kanbanie, aby rozpocząć proces ofertowania.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {offeringContacts.map((contact) => (
            <OfferingContactCard
              key={contact.id}
              contact={contact}
              teamId={teamId}
              payments={payments.filter(p => p.team_contact_id === contact.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// === Sub-component: single offering contact card ===

interface OfferingContactCardProps {
  contact: DealTeamContact;
  teamId: string;
  payments: PaymentScheduleEntry[];
}

function OfferingContactCard({ contact, teamId, payments }: OfferingContactCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const addPayment = useAddPayment();
  const deletePayment = useDeletePayment();
  const markPaid = useMarkPaymentPaid();

  const [newDate, setNewDate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'recurring' | 'one_time' | 'lump_sum'>('recurring');

  const totalValue = payments.reduce((s, p) => s + p.amount, 0);
  const nextPayment = payments.find(p => !p.is_paid);

  const handleAdd = async () => {
    if (!newDate || !newAmount) return;
    await addPayment.mutateAsync({
      teamContactId: contact.id,
      teamId,
      scheduledDate: newDate,
      amount: parseFloat(newAmount),
      description: newDesc || undefined,
      paymentType: newType,
    });
    setNewDate('');
    setNewAmount('');
    setNewDesc('');
    setShowAddPayment(false);
  };

  const typeLabels: Record<string, string> = {
    recurring: 'Cykliczna',
    one_time: 'Jednorazowa',
    lump_sum: 'Dodatkowa',
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {contact.contact?.full_name || '—'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {contact.contact?.company || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {nextPayment && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(parseISO(nextPayment.scheduled_date), 'd MMM yyyy', { locale: pl })}
                    <ArrowRight className="h-3 w-3" />
                    {formatCompactCurrency(nextPayment.amount)}
                  </Badge>
                )}
                <span className="text-sm font-semibold">
                  {formatCompactCurrency(totalValue)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {payments.length} płatn.
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            {/* Payment list */}
            {payments.length > 0 ? (
              <div className="space-y-1.5 mb-3">
                {payments.map((p) => {
                  const date = parseISO(p.scheduled_date);
                  const overdue = !p.is_paid && isPast(date);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border text-xs ${
                        p.is_paid ? 'bg-muted/20 opacity-60' : overdue ? 'bg-destructive/5 border-destructive/20' : ''
                      }`}
                    >
                      <Checkbox
                        checked={p.is_paid}
                        onCheckedChange={(checked) =>
                          markPaid.mutate({
                            id: p.id,
                            teamContactId: contact.id,
                            teamId,
                            isPaid: !!checked,
                          })
                        }
                      />
                      <span className={`w-24 ${overdue ? 'text-destructive font-medium' : ''}`}>
                        {format(date, 'd MMM yyyy', { locale: pl })}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {typeLabels[p.payment_type] || p.payment_type}
                      </Badge>
                      <span className="flex-1 truncate text-muted-foreground">{p.description || ''}</span>
                      <span className="font-semibold">{formatCompactCurrency(p.amount)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deletePayment.mutate({ id: p.id, teamContactId: contact.id, teamId })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">Brak zaplanowanych płatności</p>
            )}

            {/* Add payment form */}
            {showAddPayment ? (
              <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Kwota (PLN)</Label>
                    <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="h-8 text-xs" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Typ</Label>
                    <Select value={newType} onValueChange={v => setNewType(v as any)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recurring">Cykliczna</SelectItem>
                        <SelectItem value="one_time">Jednorazowa</SelectItem>
                        <SelectItem value="lump_sum">Dodatkowa (lump sum)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Opis</Label>
                    <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} className="h-8 text-xs" placeholder="np. Rata miesięczna" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="text-xs" onClick={handleAdd} disabled={!newDate || !newAmount || addPayment.isPending}>
                    Dodaj
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowAddPayment(false)}>
                    Anuluj
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddPayment(true)}>
                <Plus className="h-3 w-3" />
                Dodaj płatność
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
