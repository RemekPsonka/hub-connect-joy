import { useMemo, useState } from 'react';
import { useAICostSummary } from '@/hooks/useAICostSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DollarSign, TrendingUp, Activity } from 'lucide-react';

const RANGES = [
  { label: '7 dni', value: 7 },
  { label: '30 dni', value: 30 },
  { label: '90 dni', value: 90 },
];

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(4)}`;
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const AICosts = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAICostSummary(days);

  const { chartData, functions, totals } = useMemo(() => {
    const rows = data ?? [];
    const dayMap = new Map<string, Record<string, number | string>>();
    const fnSet = new Set<string>();
    let totalCost = 0;
    let totalTokens = 0;
    let totalCalls = 0;
    for (const r of rows) {
      fnSet.add(r.function_name);
      totalCost += r.total_cost_cents;
      totalTokens += r.total_tokens_in + r.total_tokens_out;
      totalCalls += r.call_count;
      const key = formatDay(r.day);
      const existing = dayMap.get(key) ?? { day: key };
      existing[r.function_name] = ((existing[r.function_name] as number) ?? 0) + r.total_cost_cents;
      dayMap.set(key, existing);
    }
    const chart = Array.from(dayMap.values()).reverse();
    return {
      chartData: chart,
      functions: Array.from(fnSet),
      totals: { cost: totalCost, tokens: totalTokens, calls: totalCalls },
    };
  }, [data]);

  const chartColors = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--secondary))',
    'hsl(var(--muted-foreground))',
    'hsl(var(--destructive))',
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Koszty AI</h1>
          <p className="text-muted-foreground mt-1">Wykorzystanie i koszty wywołań modeli AI</p>
        </div>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.value} value={String(r.value)}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Łączny koszt</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUSD(totals.cost)}</div>
            <p className="text-xs text-muted-foreground mt-1">Ostatnie {days} dni</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tokeny</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.tokens.toLocaleString('pl-PL')}</div>
            <p className="text-xs text-muted-foreground mt-1">in + out</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Wywołania</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.calls.toLocaleString('pl-PL')}</div>
            <p className="text-xs text-muted-foreground mt-1">Liczba zapytań</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Koszt dzienny per funkcja</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : error ? (
            <div className="text-sm text-destructive">Błąd ładowania danych: {(error as Error).message}</div>
          ) : chartData.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">Brak danych w wybranym zakresie.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 100).toFixed(2)}`} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => formatUSD(value)}
                />
                <Legend />
                {functions.map((fn, i) => (
                  <Bar key={fn} dataKey={fn} stackId="cost" fill={chartColors[i % chartColors.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Szczegóły</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dzień</TableHead>
                  <TableHead>Funkcja</TableHead>
                  <TableHead>Dostawca</TableHead>
                  <TableHead className="text-right">Wywołania</TableHead>
                  <TableHead className="text-right">Tokeny in</TableHead>
                  <TableHead className="text-right">Tokeny out</TableHead>
                  <TableHead className="text-right">Koszt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((r, i) => (
                  <TableRow key={`${r.day}-${r.function_name}-${i}`}>
                    <TableCell className="font-mono text-xs">{formatDay(r.day)}</TableCell>
                    <TableCell className="font-medium">{r.function_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.provider}</TableCell>
                    <TableCell className="text-right">{r.call_count}</TableCell>
                    <TableCell className="text-right">{r.total_tokens_in.toLocaleString('pl-PL')}</TableCell>
                    <TableCell className="text-right">{r.total_tokens_out.toLocaleString('pl-PL')}</TableCell>
                    <TableCell className="text-right font-mono">{formatUSD(r.total_cost_cents)}</TableCell>
                  </TableRow>
                ))}
                {(data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Brak danych.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AICosts;
