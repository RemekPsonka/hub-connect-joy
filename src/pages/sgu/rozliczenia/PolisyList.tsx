import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGetPoliciesList, useGetUnmatchedClients, type PolicyListRow } from '@/hooks/useRozliczenia';
import { PolicyDetailsSheet } from '@/components/rozliczenia/PolicyDetailsSheet';
import { UnmatchedClientsDialog } from '@/components/rozliczenia/UnmatchedClientsDialog';
import { formatCurrency } from '@/lib/formatCurrency';
import { Users } from 'lucide-react';

function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}.${m}.${y}`;
}

export default function PolisyList() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [openPolicy, setOpenPolicy] = useState<PolicyListRow | null>(null);
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);

  const limit = 50;
  const filters = useMemo(
    () => ({
      p_search: search || null,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
      p_limit: limit,
      p_offset: page * limit,
    }),
    [search, dateFrom, dateTo, page],
  );

  const { data: policies, isLoading } = useGetPoliciesList(filters);
  const { data: unmatched } = useGetUnmatchedClients();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Polisy</h1>
          <p className="text-sm text-muted-foreground">Lista polis pogrupowana po numerze, z pozycjami i prowizjami.</p>
        </div>
        <Button variant="outline" onClick={() => setUnmatchedOpen(true)}>
          <Users className="h-4 w-4 mr-2" />
          Klientów do dopasowania
          {unmatched && unmatched.length > 0 && (
            <Badge className="ml-2" variant="destructive">{unmatched.length}</Badge>
          )}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Numer polisy lub klient…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          className="max-w-[160px]"
          placeholder="Od"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          className="max-w-[160px]"
          placeholder="Do"
        />
        {(search || dateFrom || dateTo) && (
          <Button variant="ghost" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(0); }}>
            Wyczyść
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numer polisy</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Towarzystwo</TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead className="text-right">Pozycji</TableHead>
              <TableHead className="text-right">Σ Składka</TableHead>
              <TableHead className="text-right">Σ Prowizja</TableHead>
              <TableHead>Pierwsza</TableHead>
              <TableHead>Ostatnia</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : !policies || policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Brak polis. Zaimportuj plik aby zobaczyć dane.
                </TableCell>
              </TableRow>
            ) : (
              policies.map((p) => (
                <TableRow
                  key={p.policy_id}
                  className="cursor-pointer"
                  onClick={() => setOpenPolicy(p)}
                >
                  <TableCell className="font-mono text-xs">{p.master_policy_number}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{p.client_name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{p.insurer_name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{p.product_name ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {Number(p.entries_count) > 1
                      ? <Badge variant="secondary">{p.entries_count}</Badge>
                      : <span className="text-muted-foreground">{p.entries_count}</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(p.total_premium)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(p.total_commission)}</TableCell>
                  <TableCell className="text-xs">{fmtDate(p.earliest_issue_date)}</TableCell>
                  <TableCell className="text-xs">{fmtDate(p.latest_issue_date)}</TableCell>
                  <TableCell className="text-xs">{p.latest_status ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Strona {page + 1} • pokazano {policies?.length ?? 0}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Poprzednia
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!policies || policies.length < limit}
            onClick={() => setPage((p) => p + 1)}
          >
            Następna
          </Button>
        </div>
      </div>

      <PolicyDetailsSheet
        open={!!openPolicy}
        onOpenChange={(o) => !o && setOpenPolicy(null)}
        policy={openPolicy}
      />
      <UnmatchedClientsDialog open={unmatchedOpen} onOpenChange={setUnmatchedOpen} />
    </div>
  );
}
