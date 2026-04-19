import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal, Phone, Mail, ListChecks, Eye } from 'lucide-react';
import { PremiumProgress } from '@/components/sgu/PremiumProgress';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';

interface Props {
  rows: SGUClientRow[];
  isLoading: boolean;
}

function policyTypeLabel(t: string | null): string {
  if (!t) return 'inne';
  const k = t.toLowerCase();
  if (k.includes('życ') || k.includes('zyc') || k.includes('life')) return 'życie';
  if (k.includes('majątk') || k.includes('majatk') || k.includes('property')) return 'majątek';
  if (k.includes('oc')) return 'OC';
  if (k.includes('ac')) return 'AC';
  return t;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function paymentStatusColor(row: SGUClientRow): string {
  if (!row.lastPayment) return 'text-muted-foreground';
  return 'text-emerald-600';
}

export function ClientPortfolioTab({ rows, isLoading }: Props) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Ładowanie portfela…</div>;
  }
  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Brak klientów w portfelu</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Klient</TableHead>
            <TableHead>Polisy</TableHead>
            <TableHead className="min-w-[220px]">Przypis</TableHead>
            <TableHead className="text-right">Prowizja YTD</TableHead>
            <TableHead>Ostatnia rata</TableHead>
            <TableHead>Next event</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const types = Array.from(new Set(r.policies.map((p) => policyTypeLabel(p.policy_type))));
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.full_name}</div>
                  {r.company && <div className="text-xs text-muted-foreground">{r.company}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary">{r.policies.length}</Badge>
                    {types.slice(0, 4).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <PremiumProgress dealTeamContactId={r.id} compact />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCompactCurrency(r.commissionYtdGr / 100)}
                </TableCell>
                <TableCell>
                  <span className={`text-xs ${paymentStatusColor(r)}`}>
                    {r.lastPayment ? fmtDate(r.lastPayment.scheduled_date) : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{fmtDate(r.nextEvent)}</TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-56 p-1">
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <Eye className="h-4 w-4" /> Szczegóły
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                        <a href={`tel:`}>
                          <Phone className="h-4 w-4" /> Zadzwoń
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                        <a href={`mailto:`}>
                          <Mail className="h-4 w-4" /> Wyślij e-mail
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                        <ListChecks className="h-4 w-4" /> Dodaj zadanie
                      </Button>
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
