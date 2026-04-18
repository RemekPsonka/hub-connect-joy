import { Card } from '@/components/ui/card';
import { useWorkspaceKPI, KPIMetric, KPIRange } from '@/hooks/useWorkspaceKPI';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

interface Props {
  metric?: KPIMetric;
  range?: KPIRange;
}

export function KPIWidget({ metric = 'contacts_active', range = '30d' }: Props) {
  const { data, isLoading } = useWorkspaceKPI(metric, range);

  const isCurrency = metric === 'deals_revenue_mtd';
  const formatted = isCurrency
    ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(Number(data?.value ?? 0))
    : new Intl.NumberFormat('pl-PL').format(Number(data?.value ?? 0));

  return (
    <Card className="h-full p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{data?.label ?? 'KPI'}</span>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        {isLoading ? <Skeleton className="h-10 w-20" /> : <div className="text-3xl font-bold text-foreground">{formatted}</div>}
        <div className="text-[10px] text-muted-foreground mt-1">Zakres: {range}</div>
      </div>
    </Card>
  );
}
