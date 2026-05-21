import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { usePolicyEntries, type PolicyEntry } from '@/hooks/useRozliczenia';
import { Skeleton } from '@/components/ui/skeleton';

function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}.${m}.${y}`;
}

function installmentBadge(e: PolicyEntry) {
  const s = e.first_installment_status;
  if (!s) return <Badge variant="outline">brak</Badge>;
  if (s === 'paid') return <Badge className="bg-green-600 hover:bg-green-700">zapłacona {fmtDate(e.first_installment_date)}</Badge>;
  if (s === 'partial') return <Badge className="bg-amber-500 hover:bg-amber-600">częściowo {fmtDate(e.first_installment_date)}</Badge>;
  if (s === 'added') return <Badge variant="secondary">dodana</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: {
    policy_id: string;
    master_policy_number: string;
    client_company_id: string | null;
    client_name: string | null;
    insurer_name: string | null;
    product_name: string | null;
    total_premium: number;
    total_commission: number;
    entries_count: number;
  } | null;
}

export function PolicyDetailsSheet({ open, onOpenChange, policy }: Props) {
  const { data: entries, isLoading } = usePolicyEntries(policy?.policy_id);

  const correctionHashes = useMemo(() => {
    if (!entries) return new Set<string>();
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const key = `${e.issue_date}-${e.premium_assigned}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const dup = new Set<string>();
    for (const [k, v] of map) if (v > 1) dup.add(k);
    return dup;
  }, [entries]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Polisa {policy?.master_policy_number}</SheetTitle>
          <SheetDescription>
            {policy?.client_company_id ? (
              <Link
                to={`/sgu/rozliczenia/klienci/${policy.client_company_id}`}
                className="text-primary hover:underline inline-flex items-center gap-1"
                onClick={() => onOpenChange(false)}
              >
                {policy.client_name} <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              policy?.client_name ?? '—'
            )}
            {' • '}
            {policy?.insurer_name ?? '—'} • {policy?.product_name ?? '—'}
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-3 mt-4 mb-4 text-sm">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Pozycji</div>
            <div className="font-semibold">{policy?.entries_count ?? 0}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Σ Składka</div>
            <div className="font-semibold">{formatCurrency(policy?.total_premium ?? 0)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Σ Prowizja</div>
            <div className="font-semibold">{formatCurrency(policy?.total_commission ?? 0)}</div>
          </div>
        </div>

        <h3 className="text-sm font-semibold mb-2">Pozycje ({entries?.length ?? 0})</h3>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {entries?.map((e) => {
              const key = `${e.issue_date}-${e.premium_assigned}`;
              const isCorrection = correctionHashes.has(key);
              return (
                <div
                  key={e.id}
                  className={`rounded-lg border p-3 text-sm ${e.cancelled_at ? 'opacity-60 line-through' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{fmtDate(e.issue_date)}</div>
                    <div className="flex gap-1">
                      {isCorrection && <Badge variant="outline">korekta</Badge>}
                      {e.cancelled_at && <Badge variant="destructive">anulowana</Badge>}
                      {e.sale_type && <Badge variant="secondary">{e.sale_type}</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div><span className="text-muted-foreground">Składka:</span> {formatCurrency(e.premium_assigned)}</div>
                    <div><span className="text-muted-foreground">Prowizja:</span> {formatCurrency(e.commission_gross)} ({e.commission_pct ?? 0}%)</div>
                    <div><span className="text-muted-foreground">Prowizja netto:</span> {formatCurrency(e.commission_net)}</div>
                    <div><span className="text-muted-foreground">Pierwsza rata:</span> {installmentBadge(e)}</div>
                    <div><span className="text-muted-foreground">Sprzedawca:</span> {e.seller_raw ?? '—'}</div>
                    <div><span className="text-muted-foreground">Wystawił:</span> {e.issuer_raw ?? '—'}</div>
                  </div>
                </div>
              );
            })}
            {entries?.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">Brak pozycji.</div>
            )}
          </div>
        )}

        <Collapsible className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-3 w-3" /> Źródło danych
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-xs text-muted-foreground">
            <div>Polisa ID: <code>{policy?.policy_id}</code></div>
          </CollapsibleContent>
        </Collapsible>
      </SheetContent>
    </Sheet>
  );
}
