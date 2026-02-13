import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FunnelConversionChartProps {
  stats: {
    cold_count: number;
    lead_count: number;
    top_count: number;
    hot_count: number;
    offering_count: number;
    client_count: number;
  };
}

const STAGES = [
  { key: 'cold_count', label: 'COLD', color: '#94a3b8' },
  { key: 'lead_count', label: 'LEAD', color: '#3b82f6' },
  { key: 'top_count', label: 'TOP', color: '#f59e0b' },
  { key: 'hot_count', label: 'HOT', color: '#ef4444' },
  { key: 'offering_count', label: 'OFERTOWANIE', color: '#10b981' },
  { key: 'client_count', label: 'KLIENT', color: '#8b5cf6' },
] as const;

const chartConfig: ChartConfig = Object.fromEntries(
  STAGES.map((s) => [s.key, { label: s.label, color: s.color }])
);

export function FunnelConversionChart({ stats }: FunnelConversionChartProps) {
  const data = useMemo(
    () =>
      STAGES.map((s) => ({
        name: s.label,
        value: stats[s.key as keyof typeof stats] || 0,
        color: s.color,
      })),
    [stats]
  );

  const hasData = data.some((d) => d.value > 0);
  if (!hasData) return null;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Lejek konwersji</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[180px] w-full aspect-auto">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
              <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-medium" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
