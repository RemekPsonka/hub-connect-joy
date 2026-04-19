import { useMemo, useState } from 'react';
import { Download, CheckCircle2, Loader2 } from 'lucide-react';
import {
  useCommissionEntries,
  useMarkCommissionPaidOut,
  type CommissionPeriod,
  type CommissionPayoutFilter,
} from '@/hooks/useCommissionEntries';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatCurrency';

interface CommissionsTableProps {
  teamId: string;
}

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Wszyscy' },
  { value: 'sgu_company', label: 'SGU' },
  { value: 'adam', label: 'Adam' },
  { value: 'pawel', label: 'Paweł' },
  { value: 'remek', label: 'Remek' },
  { value: 'handling', label: 'Handling' },
];

export function CommissionsTable({ teamId }: CommissionsTableProps) {
  const { isPartner } = useSGUAccess();
  const { director } = useAuth();
  const canMarkPaid = isPartner || !!director;

  const [period, setPeriod] = useState<CommissionPeriod>('thisMonth');
  const [payout, setPayout] = useState<CommissionPayoutFilter>('pending');
  const [roleKey, setRoleKey] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: rows = [], isLoading } = useCommissionEntries({
    teamId,
    period,
    payout,
    roleKey: roleKey === 'all' ? null : roleKey,
  });

  const markPaid = useMarkCommissionPaidOut();

  const summary = useMemo(() => {
    const totalGr = rows.reduce((s, r) => s + r.amount_gr, 0);
    const pending = rows.filter((r) => !r.paid_out).length;
    const paid = rows.filter((r) => r.paid_out).length;
    return { totalGr, pending, paid, count: rows.length };
  }, [rows]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const pendingIds = rows.filter((r) => !r.paid_out).map((r) => r.id);
    setSelected((prev) => (prev.size === pendingIds.length ? new Set() : new Set(pendingIds)));
  };

  const handleMarkPaid = async () => {
    if (selected.size === 0) return;
    await markPaid.mutateAsync(Array.from(selected));
    setSelected(new Set());
  };

  const handleExportCsv = () => {
    const headers = [
      'Data',
      'Klient',
      'Polisa',
      'Odbiorca',
      'Rola',
      'Modyfikatory',
      'Udział %',
      'Kwota PLN',
      'Wypłacone',
    ];
    const lines = rows.map((r) => {
      const mods = Array.isArray(r.modifiers_applied)
        ? (r.modifiers_applied as string[]).join('|')
        : '';
      return [
        new Date(r.created_at).toLocaleDateString('pl-PL'),
        r.client_label ?? '',
        [r.policy_number, r.policy_name].filter(Boolean).join(' '),
        r.recipient_label,
        r.role_key ?? '',
        mods,
        r.share_pct.toString().replace('.', ','),
        (r.amount_gr / 100).toFixed(2).replace('.', ','),
        r.paid_out ? 'TAK' : 'NIE',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';');
    });
    const csv = [headers.join(';'), ...lines].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prowizje_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters + Summary */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as CommissionPeriod)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisMonth">Ten miesiąc</SelectItem>
                <SelectItem value="lastMonth">Poprzedni miesiąc</SelectItem>
                <SelectItem value="quarter">Kwartał</SelectItem>
                <SelectItem value="ytd">Rok do dziś</SelectItem>
                <SelectItem value="all">Wszystko</SelectItem>
              </SelectContent>
            </Select>

            <Select value={payout} onValueChange={(v) => setPayout(v as CommissionPayoutFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Oczekujące</SelectItem>
                <SelectItem value="paid">Wypłacone</SelectItem>
                <SelectItem value="all">Wszystkie</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleKey} onValueChange={setRoleKey}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Eksport CSV
            </Button>
            {canMarkPaid && (
              <Button
                size="sm"
                onClick={handleMarkPaid}
                disabled={selected.size === 0 || markPaid.isPending}
              >
                {markPaid.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Oznacz wypłacone ({selected.size})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Wpisów" value={summary.count.toString()} />
            <SummaryCard label="Suma" value={formatCurrency(summary.totalGr / 100)} />
            <SummaryCard label="Oczekujące" value={summary.pending.toString()} />
            <SummaryCard label="Wypłacone" value={summary.paid.toString()} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">
              Brak wpisów prowizyjnych w wybranym okresie
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canMarkPaid && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          selected.size > 0 &&
                          selected.size === rows.filter((r) => !r.paid_out).length
                        }
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Data</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead>Polisa</TableHead>
                  <TableHead>Odbiorca</TableHead>
                  <TableHead>Mod.</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Kwota</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const mods = Array.isArray(r.modifiers_applied)
                    ? (r.modifiers_applied as string[])
                    : [];
                  return (
                    <TableRow key={r.id}>
                      {canMarkPaid && (
                        <TableCell>
                          <Checkbox
                            checked={selected.has(r.id)}
                            onCheckedChange={() => toggleSelected(r.id)}
                            disabled={r.paid_out}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-xs">
                        {new Date(r.created_at).toLocaleDateString('pl-PL')}
                      </TableCell>
                      <TableCell className="text-sm">{r.client_label ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {r.policy_number ?? r.policy_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.recipient_label}</TableCell>
                      <TableCell>
                        {mods.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <div className="flex gap-1">
                            {mods.map((m) => (
                              <Badge key={m} variant="secondary" className="text-[10px] h-4 px-1">
                                {m}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {r.share_pct}%
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(r.amount_gr / 100)}
                      </TableCell>
                      <TableCell>
                        {r.paid_out ? (
                          <Badge variant="default" className="text-[10px]">
                            Wypłacone
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Oczekujące
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums mt-1">{value}</p>
    </div>
  );
}
