import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProductionRecords } from '@/hooks/useProductionRecords';
import { usePipelineKPI } from '@/hooks/usePipelineKPI';
import { POLICY_TYPE_LABELS, POLICY_TYPE_COLORS, PolicyType } from '@/components/renewal/types';
import { DEFAULT_COMMISSION_RATES } from '@/hooks/useInsuranceProductsCatalog';
import { cn } from '@/lib/utils';

interface ProductionByCategoryProps {
  year: number;
}

export function ProductionByCategory({ year }: ProductionByCategoryProps) {
  const { byCategory, totalActualPremium, totalActualCommission } = useProductionRecords(year);
  const { yearlyTarget } = usePipelineKPI(year);

  const targetPremium = yearlyTarget?.target_premium || 0;

  const categoryData = useMemo(() => {
    const categories: PolicyType[] = ['property', 'liability', 'fleet', 'do', 'cyber', 'life', 'health', 'other'];

    return categories.map((cat) => {
      const data = byCategory[cat] || { premium: 0, commission: 0, count: 0 };
      const defaultRate = DEFAULT_COMMISSION_RATES[cat];
      const actualRate = data.premium > 0 ? (data.commission / data.premium) * 100 : defaultRate;
      
      // Estimate plan based on proportion (simplified)
      const estimatedPlanPremium = targetPremium > 0 ? targetPremium / 6 : 0; // Rough equal distribution
      
      const progress = estimatedPlanPremium > 0 ? (data.premium / estimatedPlanPremium) * 100 : 0;

      return {
        category: cat,
        label: POLICY_TYPE_LABELS[cat],
        color: POLICY_TYPE_COLORS[cat],
        planPremium: estimatedPlanPremium,
        actualPremium: data.premium,
        delta: data.premium - estimatedPlanPremium,
        avgCommissionRate: actualRate,
        defaultCommissionRate: defaultRate,
        actualCommission: data.commission,
        count: data.count,
        progress,
      };
    });
  }, [byCategory, targetPremium]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  const formatDelta = (delta: number) => {
    const prefix = delta > 0 ? '+' : '';
    return `${prefix}${formatCurrency(delta)}`;
  };

  const hasData = categoryData.some(c => c.count > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Podział produkcji wg ryzyka</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8 text-muted-foreground">
            Brak danych produkcji. Dodaj pierwsze rekordy w tabeli powyżej.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ryzyko</TableHead>
                  <TableHead className="text-right">Składka plan</TableHead>
                  <TableHead className="text-right">Składka real</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead className="text-right">Avg. prow.</TableHead>
                  <TableHead className="text-right">Prowizja real</TableHead>
                  <TableHead className="w-[150px]">Realizacja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryData.map((cat) => (
                  <TableRow key={cat.category} className={cn(cat.count === 0 && 'text-muted-foreground')}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `${cat.color}20`,
                          color: cat.color,
                        }}
                      >
                        {cat.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(cat.planPremium)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {cat.count > 0 ? formatCurrency(cat.actualPremium) : '-'}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        cat.delta > 0 && 'text-green-600',
                        cat.delta < 0 && 'text-red-600'
                      )}
                    >
                      {cat.count > 0 ? formatDelta(cat.delta) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {cat.count > 0 ? `${cat.avgCommissionRate.toFixed(1)}%` : `${cat.defaultCommissionRate}%`}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {cat.count > 0 ? formatCurrency(cat.actualCommission) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(cat.progress, 100)}
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {cat.count > 0 ? `${cat.progress.toFixed(0)}%` : '-'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Summary row */}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell>RAZEM</TableCell>
                  <TableCell className="text-right">{formatCurrency(targetPremium)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalActualPremium)}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right',
                      totalActualPremium - targetPremium > 0 && 'text-green-600',
                      totalActualPremium - targetPremium < 0 && 'text-red-600'
                    )}
                  >
                    {formatDelta(totalActualPremium - targetPremium)}
                  </TableCell>
                  <TableCell className="text-right">
                    {totalActualPremium > 0
                      ? `${((totalActualCommission / totalActualPremium) * 100).toFixed(1)}%`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(totalActualCommission)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
