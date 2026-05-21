import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGetCompanyHolding, useGetPoliciesList } from '@/hooks/useRozliczenia';
import { HoldingTree } from '@/components/rozliczenia/HoldingTree';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatCurrency';
import { ArrowLeft, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function findRoot(nodes: { company_id: string; parent_company_id: string | null }[] | undefined, current: string) {
  // Holding tree RPC takes root → descendants. If currentCompany has a parent, we need to walk up.
  if (!nodes) return current;
  return current; // RPC is called with rootId; we precompute root separately below
}

export default function KlientWidok() {
  const { companyId = '' } = useParams<{ companyId: string }>();
  const [holdingView, setHoldingView] = useState(false);

  // Fetch company itself
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['rozliczenia', 'company', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, nip, krs, parent_company_id')
        .eq('id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Walk up to root
  const { data: rootId } = useQuery({
    queryKey: ['rozliczenia', 'company', companyId, 'root'],
    queryFn: async () => {
      let currentId: string = companyId;
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase
          .from('companies')
          .select('id, parent_company_id')
          .eq('id', currentId)
          .maybeSingle();
        if (!data?.parent_company_id) return currentId;
        currentId = data.parent_company_id;
      }
      return currentId;
    },
    enabled: !!companyId,
  });

  const { data: holding } = useGetCompanyHolding(rootId);

  // Scope: current company or whole holding
  const scopedCompanyIds = useMemo(() => {
    if (holdingView && holding) return holding.map((h) => h.company_id);
    return [companyId];
  }, [holdingView, holding, companyId]);

  // KPIs from holding RPC aggregates (when scope is whole holding) or single company
  const totals = useMemo(() => {
    if (!holding) return null;
    const scoped = holding.filter((h) => scopedCompanyIds.includes(h.company_id));
    return {
      policies: scoped.reduce((s, h) => s + Number(h.total_policies), 0),
      premiumYtd: scoped.reduce((s, h) => s + Number(h.total_premium_ytd), 0),
      commissionYtd: scoped.reduce((s, h) => s + Number(h.total_commission_ytd), 0),
    };
  }, [holding, scopedCompanyIds]);

  // Policies list (scoped)
  const { data: policies } = useGetPoliciesList({
    p_client_id: holdingView ? null : companyId,
    p_limit: 100,
  });

  // Monthly premium last 12 months
  const { data: monthly } = useQuery({
    queryKey: ['rozliczenia', 'company', companyId, 'monthly', holdingView, scopedCompanyIds],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 12);
      const { data, error } = await supabase
        .from('policy_entries')
        .select('issue_date, premium_assigned, product_name, insurance_policies!inner(company_id)')
        .in('insurance_policies.company_id', scopedCompanyIds)
        .gte('issue_date', cutoff.toISOString().slice(0, 10));
      if (error) throw error;
      return data ?? [];
    },
    enabled: scopedCompanyIds.length > 0,
  });

  const monthlyChart = useMemo(() => {
    if (!monthly) return [];
    const buckets = new Map<string, number>();
    monthly.forEach((m) => {
      if (!m.issue_date) return;
      const key = (m.issue_date as string).slice(0, 7);
      buckets.set(key, (buckets.get(key) ?? 0) + Number(m.premium_assigned ?? 0));
    });
    return Array.from(buckets.entries())
      .sort()
      .map(([month, value]) => ({ month, value }));
  }, [monthly]);

  const productPie = useMemo(() => {
    if (!monthly) return [];
    const buckets = new Map<string, number>();
    monthly.forEach((m) => {
      const k = (m.product_name as string) ?? 'inne';
      buckets.set(k, (buckets.get(k) ?? 0) + Number(m.premium_assigned ?? 0));
    });
    return Array.from(buckets.entries()).map(([name, value]) => ({ name, value }));
  }, [monthly]);

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#a78bfa', '#f59e0b', '#10b981'];

  if (companyLoading || !company) {
    return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  }

  const hasHolding = holding && holding.length > 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sgu/rozliczenia/polisy"><ArrowLeft className="h-4 w-4 mr-1" /> Polisy</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted h-12 w-12 flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <div className="text-sm text-muted-foreground flex gap-3">
              {company.nip && <span>NIP: {company.nip}</span>}
              {company.krs && <span>KRS: {company.krs}</span>}
              <Link to={`/companies/${company.id}`} className="text-primary hover:underline">
                karta firmy →
              </Link>
            </div>
          </div>
        </div>
        {hasHolding && (
          <Button
            variant={holdingView ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHoldingView((v) => !v)}
          >
            {holdingView ? 'Widok firmy' : 'Widok holdingowy'}
          </Button>
        )}
      </div>

      {hasHolding && rootId && (
        <HoldingTree rootCompanyId={rootId} currentCompanyId={companyId} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Polis ogółem</div>
          <div className="text-xl font-bold">{totals?.policies ?? 0}</div>
          {holdingView && <Badge variant="secondary" className="text-[10px] mt-1">holding</Badge>}
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Σ Składka YTD</div>
          <div className="text-xl font-bold">{formatCurrency(totals?.premiumYtd ?? 0)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Σ Prowizja YTD</div>
          <div className="text-xl font-bold">{formatCurrency(totals?.commissionYtd ?? 0)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Aktywne polisy</div>
          <div className="text-xl font-bold">{policies?.length ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-2">Składka miesięcznie (12 mc)</h3>
          {monthlyChart.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Brak danych.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChart}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-2">Rozkład per produkt</h3>
          {productPie.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Brak danych.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={productPie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80}>
                  {productPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b text-sm font-medium">
          Polisy {holdingView ? '(holding)' : `klienta`}
          {policies && <span className="text-muted-foreground ml-2">({policies.length})</span>}
        </div>
        <div className="divide-y">
          {policies?.map((p) => (
            <div key={p.policy_id} className="px-4 py-2 grid grid-cols-[1fr,1fr,80px,120px] gap-2 text-sm items-center">
              <div className="font-mono text-xs truncate">{p.master_policy_number}</div>
              <div className="text-xs truncate">{p.insurer_name} • {p.product_name}</div>
              <div className="text-xs text-right">{p.entries_count} poz.</div>
              <div className="text-xs text-right tabular-nums">{formatCurrency(p.total_premium)}</div>
            </div>
          ))}
          {policies && policies.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Brak polis.</div>
          )}
        </div>
      </div>
    </div>
  );
}
