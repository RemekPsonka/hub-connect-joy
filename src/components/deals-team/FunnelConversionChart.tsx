import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface FunnelBucket {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface FunnelConversionChartProps {
  buckets: FunnelBucket[];
  title?: string;
}

export function FunnelConversionChart({ buckets, title = 'Lejek konwersji' }: FunnelConversionChartProps) {
  const chartConfig: ChartConfig = useMemo(
    () => Object.fromEntries(buckets.map((b) => [b.key, { label: b.label, color: b.color }])),
    [buckets]
  );

  const data = useMemo(
    () => buckets.map((b) => ({ name: b.label, value: b.value, color: b.color })),
    [buckets]
  );

  const hasData = data.some((d) => d.value > 0);
  if (!hasData) return null;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full aspect-auto">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 48, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
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
