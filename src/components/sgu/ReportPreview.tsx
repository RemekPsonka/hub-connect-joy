import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSnapshotPreview } from '@/hooks/useSnapshotPreview';
import { ExportPDFButton } from '@/components/sgu/ExportPDFButton';
import { SEVERITY_LABELS, type SGUAlertSeverity } from '@/types/sgu-report-snapshot';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  'hsl(var(--muted))',
  'hsl(var(--destructive))',
  'hsl(var(--ring))',
];

const fmtPLN = (gr: number): string =>
  new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(gr / 100) +
  ' PLN';
const fmtPct = (n: number): string => `${n.toFixed(1).replace('.', ',')}%`;

const severityVariant: Record<SGUAlertSeverity, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  critical: 'destructive',
};

interface ReportPreviewProps {
  snapshotId: string;
}

export function ReportPreview({ snapshotId }: ReportPreviewProps) {
  const { data: snapshot, isLoading } = useSnapshotPreview(snapshotId);

  const pieData = useMemo(() => {
    if (!snapshot) return [];
    const breakdown = Array.isArray(snapshot.data?.commission_breakdown)
      ? snapshot.data.commission_breakdown
      : [];
    return breakdown.map((r) => ({
      name: r.recipient_label,
      value: r.amount_pln / 100,
    }));
  }, [snapshot]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!snapshot) return <p className="text-muted-foreground p-4">Brak danych raportu.</p>;

  const kpi = snapshot.data.kpi;
  const deltas = snapshot.data.comparison_previous_period?.deltas ?? [];
  const deltaFor = (m: keyof typeof kpi) => deltas.find((d) => d.metric === m)?.delta_pct ?? null;

  const KpiCard = ({ label, value, metricKey }: { label: string; value: string; metricKey: keyof typeof kpi }) => {
    const d = deltaFor(metricKey);
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{value}</p>
          {d !== null && (
            <p className={`text-xs mt-1 ${d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {d >= 0 ? '+' : ''}
              {d.toFixed(1).replace('.', ',')}% vs poprzedni okres
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Okres: {snapshot.period_start} → {snapshot.period_end}
          </p>
          <p className="text-xs text-muted-foreground">
            Wygenerowano: {new Date(snapshot.generated_at).toLocaleString('pl-PL')} ·{' '}
            {snapshot.generated_by === 'cron' ? 'automatycznie' : 'ręcznie'}
          </p>
        </div>
        <ExportPDFButton snapshot={snapshot} />
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard label="Sprzedane polisy" value={String(kpi.policies_sold_count)} metricKey="policies_sold_count" />
        <KpiCard label="GWP" value={fmtPLN(kpi.gwp_pln)} metricKey="gwp_pln" />
        <KpiCard label="Prowizje" value={fmtPLN(kpi.commission_pln)} metricKey="commission_pln" />
        <KpiCard label="Zadania zakończone" value={String(kpi.completed_tasks_count)} metricKey="completed_tasks_count" />
        <KpiCard label="Nowe leady" value={String(kpi.new_leads_count)} metricKey="new_leads_count" />
        <KpiCard label="Konwersja" value={fmtPct(kpi.conversion_rate_pct)} metricKey="conversion_rate_pct" />
      </div>

      {snapshot.data.top_products?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top produkty</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-right">Polisy</TableHead>
                  <TableHead className="text-right">GWP</TableHead>
                  <TableHead className="text-right">Prowizja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.data.top_products.map((p, idx) => (
                  <TableRow key={`${p.product_id ?? 'np'}-${idx}`}>
                    <TableCell>{p.product_name}</TableCell>
                    <TableCell className="text-right">{p.policies_count}</TableCell>
                    <TableCell className="text-right">{fmtPLN(p.gwp_pln)}</TableCell>
                    <TableCell className="text-right">{fmtPLN(p.commission_pln)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {snapshot.data.team_performance?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wyniki zespołu</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Osoba</TableHead>
                  <TableHead className="text-right">Polisy</TableHead>
                  <TableHead className="text-right">GWP</TableHead>
                  <TableHead className="text-right">Prowizja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.data.team_performance.map((r, idx) => (
                  <TableRow key={`${r.user_id ?? 'np'}-${idx}`}>
                    <TableCell>{r.full_name}</TableCell>
                    <TableCell className="text-right">{r.policies_count}</TableCell>
                    <TableCell className="text-right">{fmtPLN(r.gwp_pln)}</TableCell>
                    <TableCell className="text-right">{fmtPLN(r.commission_pln)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Podział prowizji</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v: number) => `${v.toLocaleString('pl-PL')} PLN`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {snapshot.data.alerts?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshot.data.alerts.map((a, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-md border">
                <Badge variant={severityVariant[a.severity]}>{SEVERITY_LABELS[a.severity]}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs text-muted-foreground">{a.code}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
