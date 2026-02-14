import { useState } from 'react';
import { format, parseISO, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CalendarDays, DollarSign, Plus, Trash2, ArrowRight, X,
} from 'lucide-react';
import { useAddPayment, useDeletePayment, useMarkPaymentPaid, type PaymentScheduleEntry } from '@/hooks/usePaymentSchedule';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { DealTeamContact } from '@/types/dealTeam';

interface OfferingContactCardProps {
  contact: DealTeamContact;
  teamId: string;
  payments: PaymentScheduleEntry[];
  onClose: () => void;
}

export function OfferingContactCard({ contact, teamId, payments, onClose }: OfferingContactCardProps) {
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
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {contact.contact?.full_name || '—'} — {contact.contact?.company || '—'}
          </CardTitle>
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
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
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
    </Card>
  );
}
