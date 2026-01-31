import { useMemo } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Building2, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRenewalPotential, PeriodType } from '@/hooks/useRenewalPotential';
import { POLICY_TYPE_LABELS, POLICY_TYPE_COLORS } from '@/components/renewal/types';
import { cn } from '@/lib/utils';

interface RenewalPotentialAnalysisProps {
  year: number;
  period: PeriodType;
  periodIndex: number;
  yearlyTarget: number;
}

export function RenewalPotentialAnalysis({
  year,
  period,
  periodIndex,
  yearlyTarget,
}: RenewalPotentialAnalysisProps) {
  const {
    foreignPoliciesInRange,
    totalPotentialPremium,
    potentialByCategory,
    isLoading,
  } = useRenewalPotential(year, period, periodIndex);

  const potentialPercentage = yearlyTarget > 0
    ? (totalPotentialPremium / yearlyTarget) * 100
    : 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M PLN`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k PLN`;
    }
    return `${value.toFixed(0)} PLN`;
  };

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'month':
        return format(new Date(year, periodIndex - 1, 1), 'LLLL yyyy', { locale: pl });
      case 'quarter':
        return `Q${periodIndex} ${year}`;
      case 'year':
      default:
        return `${year}`;
    }
  }, [year, period, periodIndex]);

  const sortedPolicies = useMemo(() => {
    return [...foreignPoliciesInRange].sort((a, b) => {
      return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    });
  }, [foreignPoliciesInRange]);

  const categoryStats = useMemo(() => {
    return Object.entries(potentialByCategory)
      .filter(([_, value]) => value > 0)
      .sort(([, a], [, b]) => b - a);
  }, [potentialByCategory]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Potencjał odnowień</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Potencjał odnowień obcych polis
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Polisy wygasające w okresie: {periodLabel}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Suma potencjału:</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(totalPotentialPremium)}
            </span>
          </div>
          <Progress value={Math.min(potentialPercentage, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {potentialPercentage.toFixed(1)}% celu rocznego ({foreignPoliciesInRange.length} polis)
          </p>
        </div>

        {/* By category */}
        {categoryStats.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Podział wg kategorii:</p>
            <div className="grid grid-cols-2 gap-2">
              {categoryStats.map(([category, value]) => (
                <div
                  key={category}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${POLICY_TYPE_COLORS[category as keyof typeof POLICY_TYPE_COLORS]}20`,
                      color: POLICY_TYPE_COLORS[category as keyof typeof POLICY_TYPE_COLORS],
                    }}
                  >
                    {POLICY_TYPE_LABELS[category as keyof typeof POLICY_TYPE_LABELS]}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatCurrency(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Policy list */}
        {sortedPolicies.length > 0 ? (
          <div>
            <p className="text-sm font-medium mb-2">Lista polis:</p>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {sortedPolicies.map((policy) => (
                  <div
                    key={policy.id}
                    className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {policy.company?.name || 'Brak firmy'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {policy.policy_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-medium">
                        {formatCurrency(policy.premium || 0)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(policy.end_date), 'd MMM', { locale: pl })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak obcych polis wygasających w tym okresie
          </p>
        )}
      </CardContent>
    </Card>
  );
}
