import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MoreHorizontal, Phone, Mail, ListChecks, Eye } from 'lucide-react';
import { PremiumProgress } from '@/components/sgu/PremiumProgress';
import { StageBadge } from '@/components/sgu/sales/StageBadge';
import { useClientComplexity } from '@/hooks/useClientComplexity';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';
import { ClientDetailsDialog } from './ClientDetailsDialog';
import { AddClientTaskDialog } from './AddClientTaskDialog';

interface Props {
  rows: SGUClientRow[];
  isLoading: boolean;
  teamId: string;
  onSelectClient?: (id: string) => void;
  filter?: string | null;
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

const TODAY = new Date().toISOString().slice(0, 10);

function paymentStatusColor(row: SGUClientRow): string {
  if (!row.lastPayment) return 'text-muted-foreground';
  if (row.nextPaymentDate && row.nextPaymentDate < TODAY) {
    return 'text-destructive';
  }
  return 'text-emerald-600';
}

export function ClientPortfolioTab({ rows, isLoading, teamId, onSelectClient, filter }: Props) {
  const complexityMap = useClientComplexity(rows);
  const updateContact = useUpdateTeamContact();
  const [detailsClient, setDetailsClient] = useState<SGUClientRow | null>(null);
  const [taskClient, setTaskClient] = useState<SGUClientRow | null>(null);

  let visibleRows = rows;
  if (filter === 'ambassadors') {
    visibleRows = rows.filter((r) => (r.client_status ?? '') === 'ambassador');
  } else if (filter === 'stale') {
    // No interaction marker on row → sort by next event ascending (oldest first)
    visibleRows = [...rows].sort((a, b) =>
      (a.nextEvent ?? '9999').localeCompare(b.nextEvent ?? '9999'),
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Ładowanie portfela…</div>;
  }
  if (visibleRows.length === 0) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Brak klientów w portfelu</div>;
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Klient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Polisy</TableHead>
              <TableHead>Obszary</TableHead>
              <TableHead className="min-w-[220px]">Przypis</TableHead>
              <TableHead className="text-right">Prowizja YTD</TableHead>
              <TableHead>Ostatnia rata</TableHead>
              <TableHead>Next event</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((r) => {
              const types = Array.from(new Set(r.policies.map((p) => policyTypeLabel(p.policy_type))));
              const complexity = complexityMap.get(r.id);
              return (
                <TableRow
                  key={r.id}
                  className={onSelectClient ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={onSelectClient ? () => onSelectClient(r.id) : undefined}
                >
                  <TableCell>
                    <div className="font-medium">{r.full_name}</div>
                    {r.company && <div className="text-xs text-muted-foreground">{r.company}</div>}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <StageBadge
                      stage="client"
                      value={(r.client_status ?? 'standard') as 'standard' | 'ambassador' | 'lost'}
                      onChange={(v) =>
                        updateContact.mutate({ id: r.id, teamId, clientStatus: v })
                      }
                    />
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
                    <div className="flex items-center gap-0.5">
                      {complexity?.areas.map((a) => (
                        <Tooltip key={a.label}>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                'text-base leading-none transition-opacity',
                                a.active ? 'opacity-100' : 'opacity-30',
                              )}
                              aria-label={a.label}
                            >
                              {a.icon}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <div className="font-medium">{a.label}</div>
                            <div className="text-muted-foreground">
                              {a.active ? 'Aktywny' : 'Brak aktywności'}
                            </div>
                          </TooltipContent>
                        </Tooltip>
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-56 p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setDetailsClient(r)}
                        >
                          <Eye className="h-4 w-4" /> Szczegóły
                        </Button>
                        {r.phone ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2"
                            asChild
                          >
                            <a href={`tel:${r.phone}`}>
                              <Phone className="h-4 w-4" /> Zadzwoń
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 opacity-50 cursor-not-allowed"
                            disabled
                            aria-disabled="true"
                          >
                            <Phone className="h-4 w-4" /> Brak telefonu
                          </Button>
                        )}
                        {r.email ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2"
                            asChild
                          >
                            <a href={`mailto:${r.email}`}>
                              <Mail className="h-4 w-4" /> Wyślij e-mail
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 opacity-50 cursor-not-allowed"
                            disabled
                            aria-disabled="true"
                          >
                            <Mail className="h-4 w-4" /> Brak e-maila
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setTaskClient(r)}
                        >
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

      <ClientDetailsDialog
        client={detailsClient}
        open={!!detailsClient}
        onOpenChange={(o) => !o && setDetailsClient(null)}
      />
      <AddClientTaskDialog
        open={!!taskClient}
        onOpenChange={(o) => !o && setTaskClient(null)}
        clientId={taskClient?.id ?? null}
        clientName={taskClient?.full_name}
        teamId={teamId}
      />
    </TooltipProvider>
  );
}
