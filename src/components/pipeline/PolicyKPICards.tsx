import { Card, CardContent } from '@/components/ui/card';
import { Clock, FileEdit, AlertTriangle, Briefcase } from 'lucide-react';
import type { PipelineStats } from '@/hooks/useAllPolicies';

interface PolicyKPICardsProps {
  stats: PipelineStats;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k`;
  }
  return amount.toFixed(0);
}

export function PolicyKPICards({ stats }: PolicyKPICardsProps) {
  const cards = [
    {
      title: 'Do zrobienia',
      value: stats.backlog.length,
      subtitle: `Polisy aktywne (>120 dni)`,
      icon: Clock,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
    },
    {
      title: 'Przygotowanie',
      value: stats.preparation.length,
      subtitle: '30-120 dni do wygaśnięcia',
      icon: FileEdit,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      title: 'Finalizacja',
      value: stats.finalization.length,
      subtitle: '<30 dni - pilne!',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
    {
      title: 'Nasze polisy',
      value: stats.ourPolicies.length,
      subtitle: `${formatCurrency(stats.ourPremium)} PLN składki`,
      icon: Briefcase,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className={card.bgColor}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className={`text-3xl font-bold mt-1 ${card.color}`}>
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
