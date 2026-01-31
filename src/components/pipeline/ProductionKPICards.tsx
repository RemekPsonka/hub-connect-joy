import { useMemo } from 'react';
import { Target, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePipelineKPI } from '@/hooks/usePipelineKPI';
import { useProductionRecords } from '@/hooks/useProductionRecords';
import { cn } from '@/lib/utils';

interface ProductionKPICardsProps {
  year: number;
}

export function ProductionKPICards({ year }: ProductionKPICardsProps) {
  const { yearlyTarget } = usePipelineKPI(year);
  const { totalActualPremium, totalActualCommission } = useProductionRecords(year);

  const targetPremium = yearlyTarget?.target_premium || 0;
  const targetCommission = yearlyTarget?.target_commission || 0;
  const avgCommissionRate = yearlyTarget?.target_commission_rate || 15;

  const premiumProgress = targetPremium > 0 ? (totalActualPremium / targetPremium) * 100 : 0;
  const commissionProgress = targetCommission > 0 ? (totalActualCommission / targetCommission) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  const cards = [
    {
      title: 'Cel składki',
      value: formatCurrency(targetPremium),
      subtitle: 'cel roczny',
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      progress: null,
    },
    {
      title: 'Realna składka',
      value: formatCurrency(totalActualPremium),
      subtitle: `${premiumProgress.toFixed(1)}% celu`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      progress: premiumProgress,
      progressColor: premiumProgress >= 100 ? 'bg-emerald-500' : undefined,
    },
    {
      title: 'Cel prowizji',
      value: formatCurrency(targetCommission),
      subtitle: `avg ${avgCommissionRate}%`,
      icon: Wallet,
      color: 'text-violet-600',
      bgColor: 'bg-violet-500/10',
      progress: null,
    },
    {
      title: 'Realna prowizja',
      value: formatCurrency(totalActualCommission),
      subtitle: `${commissionProgress.toFixed(1)}% celu`,
      icon: PiggyBank,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      progress: commissionProgress,
      progressColor: commissionProgress >= 100 ? 'bg-amber-500' : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={cn('p-2 rounded-lg', card.bgColor)}>
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <p className="text-2xl font-bold tracking-tight">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </div>
            {card.progress !== null && (
              <Progress
                value={Math.min(card.progress, 100)}
                className={cn('mt-3 h-1.5', card.progressColor && '[&>div]:' + card.progressColor)}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
