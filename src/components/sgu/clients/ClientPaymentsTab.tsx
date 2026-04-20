import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { toast } from 'sonner';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { format, addMonths, startOfMonth, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';

type Filter = 'all' | 'overdue' | 'this_month' | 'upcoming_30d';

interface Props {
  rows: SGUClientRow[];
  teamId: string;
}

interface FlatPayment {
  id: string;
  clientName: string;
  clientId: string;
  scheduled_date: string;
  amount: number;
  is_paid: boolean;
  description: string | null;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

export function ClientPaymentsTab({ rows, teamId }: Props) {
  const [filter, setFilter] = useState<Filter>('overdue');
  const qc = useQueryClient();
  const { isPartner } = useSGUAccess();
  const { isAdmin } = useOwnerPanel();
  const canMarkPaid = isPartner || isAdmin;

  const flat: FlatPayment[] = useMemo(() => {
    const out: FlatPayment[] = [];
    for (const r of rows) {
      for (const p of r.payments) {
        out.push({
          id: p.id,
          clientName: r.full_name,
          clientId: r.id,
          scheduled_date: p.scheduled_date,
          amount: p.amount,
          is_paid: p.is_paid,
          description: p.description,
        });
      }
    }
    return out;
  }, [rows]);

  // Timeline 24mc — booked (scheduled) vs paid per month
  const timelineData = useMemo(() => {
    const now = startOfMonth(new Date());
    const start = addMonths(now, -23);
    const months = Array.from({ length: 24 }, (_, i) => {
      const d = addMonths(start, i);
      return {
        month: format(d, 'LLL yy', { locale: pl }),
        key: format(d, 'yyyy-MM'),
        booked: 0,
        paid: 0,
      };
    });
    const indexByKey = new Map(months.map((m, i) => [m.key, i]));
    for (const p of flat) {
      const k = format(parseISO(p.scheduled_date), 'yyyy-MM');
      const idx = indexByKey.get(k);
      if (idx === undefined) continue;
      months[idx].booked += p.amount;
      if (p.is_paid) months[idx].paid += p.amount;
    }
    return months;
  }, [flat]);

  const timelineConfig: ChartConfig = {
    booked: { label: 'Zaplanowane', color: 'hsl(var(--primary))' },
    paid: { label: 'Opłacone', color: 'hsl(142 71% 45%)' },
  };

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    let list = flat;
    if (filter === 'overdue') list = flat.filter((p) => !p.is_paid && p.scheduled_date < today);
    else if (filter === 'this_month')
      list = flat.filter((p) => p.scheduled_date >= monthStartStr && p.scheduled_date <= monthEnd);
    else if (filter === 'upcoming_30d')
      list = flat.filter((p) => !p.is_paid && p.scheduled_date >= today && p.scheduled_date <= in30Str);
    return list.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [flat, filter, today, monthStartStr, monthEnd, in30Str]);

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deal_team_payment_schedule')
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Oznaczono jako opłacone');
      qc.invalidateQueries({ queryKey: ['sgu-clients-portfolio'] });
      qc.invalidateQueries({ queryKey: ['sgu-premium-progress'] });
    },
    onError: (e) => toast.error('Błąd', { description: (e as Error).message }),
  });

  function rowColor(p: FlatPayment): string {
    if (p.is_paid) return 'bg-emerald-500/5';
    if (p.scheduled_date < today) return 'bg-destructive/10';
    const diff = (new Date(p.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff <= 7) return 'bg-amber-500/10';
    return '';
  }

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border p-1 text-sm">
        {(['all', 'overdue', 'this_month', 'upcoming_30d'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded ${
              filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {f === 'all' && 'Wszystkie'}
            {f === 'overdue' && 'Zaległe'}
            {f === 'this_month' && 'Ten miesiąc'}
            {f === 'upcoming_30d' && 'Nadchodzące 30d'}
          </button>
        ))}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Klient</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead className="text-right">Kwota</TableHead>
              <TableHead>Opis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  Brak rat w wybranym filtrze
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={p.id} className={rowColor(p)}>
                <TableCell className="font-medium">{p.clientName}</TableCell>
                <TableCell>{fmtDate(p.scheduled_date)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCompactCurrency(p.amount)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.description ?? '—'}</TableCell>
                <TableCell>
                  {p.is_paid ? (
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">
                      Opłacone
                    </Badge>
                  ) : p.scheduled_date < today ? (
                    <Badge variant="destructive">Zaległe</Badge>
                  ) : (
                    <Badge variant="outline">Oczekuje</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!p.is_paid && canMarkPaid && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markPaid.mutate(p.id)}
                      disabled={markPaid.isPending}
                      className="gap-1"
                    >
                      <Check className="h-3 w-3" /> Oznacz paid
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
