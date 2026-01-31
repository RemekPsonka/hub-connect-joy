import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductionRecords } from '@/hooks/useProductionRecords';
import { usePipelineKPI } from '@/hooks/usePipelineKPI';

const MONTH_NAMES = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
  'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'
];

interface ProductionChartProps {
  year: number;
}

export function ProductionChart({ year }: ProductionChartProps) {
  const [chartType, setChartType] = useState<'premium' | 'commission'>('premium');
  const { monthlyTotals } = useProductionRecords(year);
  const { yearlyTarget, monthlyTargets } = usePipelineKPI(year);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  const chartData = monthlyTotals.map((mt) => {
    const monthTarget = monthlyTargets.find(t => t.month === mt.month);
    const monthlyPremiumTarget = monthTarget?.target_premium || (yearlyTarget?.target_premium || 0) / 12;
    const monthlyCommissionTarget = monthTarget?.target_commission || (yearlyTarget?.target_commission || 0) / 12;

    return {
      month: MONTH_NAMES[mt.month - 1],
      monthNum: mt.month,
      planPremium: monthlyPremiumTarget,
      realizacjaPremium: mt.actualPremium,
      planCommission: monthlyCommissionTarget,
      realizacjaCommission: mt.actualCommission,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}: </span>
              <span className="font-medium">
                {formatCurrency(entry.value)} PLN
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Plan vs Realizacja - {year}</CardTitle>
          <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'premium' | 'commission')}>
            <TabsList className="h-8">
              <TabsTrigger value="premium" className="text-xs px-3">Składka</TabsTrigger>
              <TabsTrigger value="commission" className="text-xs px-3">Prowizja</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartType === 'premium' ? (
              <>
                <Bar
                  dataKey="planPremium"
                  name="Plan"
                  fill="hsl(var(--muted-foreground))"
                  opacity={0.4}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="realizacjaPremium"
                  name="Realizacja"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </>
            ) : (
              <>
                <Bar
                  dataKey="planCommission"
                  name="Plan"
                  fill="hsl(var(--muted-foreground))"
                  opacity={0.4}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="realizacjaCommission"
                  name="Realizacja"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
