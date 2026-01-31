import { useMemo } from 'react';
import { differenceInDays, format } from 'date-fns';
import { Building2, Calendar, TrendingUp, Target, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { POLICY_TYPE_LABELS, POLICY_TYPE_COLORS, type PolicyType } from '@/components/renewal/types';
import type { PipelineStats, PolicyWithCompany } from '@/hooks/useAllPolicies';

interface PolicyFinancialReportsProps {
  stats: PipelineStats;
  yearlyGoal?: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PolicyFinancialReports({ stats, yearlyGoal = 5000000 }: PolicyFinancialReportsProps) {
  const ourPoliciesByType = useMemo(() => {
    const byType: Record<PolicyType, { count: number; premium: number }> = {
      property: { count: 0, premium: 0 },
      fleet: { count: 0, premium: 0 },
      do: { count: 0, premium: 0 },
      cyber: { count: 0, premium: 0 },
      liability: { count: 0, premium: 0 },
      life: { count: 0, premium: 0 },
      health: { count: 0, premium: 0 },
      other: { count: 0, premium: 0 },
    };

    stats.ourPolicies.forEach(p => {
      const type = p.policy_type as PolicyType;
      if (byType[type]) {
        byType[type].count++;
        byType[type].premium += p.premium || 0;
      }
    });

    return Object.entries(byType)
      .filter(([, data]) => data.count > 0)
      .sort(([, a], [, b]) => b.premium - a.premium);
  }, [stats.ourPolicies]);

  const foreignOpportunities = useMemo(() => {
    const today = new Date();
    return stats.foreignPolicies
      .filter(p => {
        const daysLeft = differenceInDays(new Date(p.end_date), today);
        return daysLeft > 0 && daysLeft <= 120;
      })
      .sort((a, b) => {
        return differenceInDays(new Date(a.end_date), new Date(b.end_date));
      });
  }, [stats.foreignPolicies]);

  const progressPercent = Math.min((stats.ourPremium / yearlyGoal) * 100, 100);

  const uniqueCompaniesWithForeign = useMemo(() => {
    const companies = new Set<string>();
    stats.foreignPolicies.forEach(p => {
      if (p.company) companies.add(p.company.id);
    });
    return companies.size;
  }, [stats.foreignPolicies]);

  return (
    <div className="space-y-6">
      {/* Nasze polisy - cel roczny */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Nasze polisy - cel roczny
              </CardTitle>
              <CardDescription>
                Portfel polis obsługiwanych jako broker
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {stats.ourPolicies.length} polis
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Cel: {formatCurrency(yearlyGoal)} PLN
              </span>
              <span className="font-medium">
                {progressPercent.toFixed(1)}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(stats.ourPremium)} PLN
              </span>
              <span className="text-sm text-muted-foreground">
                Pozostało: {formatCurrency(Math.max(yearlyGoal - stats.ourPremium, 0))} PLN
              </span>
            </div>
          </div>

          {/* Podział wg typu */}
          <div>
            <h4 className="text-sm font-medium mb-3">Sprzedaż wg typu polisy</h4>
            <div className="space-y-2">
              {ourPoliciesByType.map(([type, data]) => {
                const percent = (data.premium / stats.ourPremium) * 100;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: POLICY_TYPE_COLORS[type as PolicyType] }}
                    />
                    <span className="text-sm w-20 shrink-0">
                      {POLICY_TYPE_LABELS[type as PolicyType]}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: POLICY_TYPE_COLORS[type as PolicyType],
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {data.count} szt.
                    </span>
                    <span className="text-sm text-muted-foreground w-24 text-right">
                      {formatCurrency(data.premium)} PLN
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Obce polisy - potencjał */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Obce polisy - potencjał do przejęcia
              </CardTitle>
              <CardDescription>
                Polisy klientów obsługiwane przez innych brokerów
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(stats.foreignPremium)} PLN
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.foreignPolicies.length} polis · {uniqueCompaniesWithForeign} klientów
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h4 className="text-sm font-medium">
              Polisy wygasające w najbliższych 120 dniach ({foreignOpportunities.length})
            </h4>

            {foreignOpportunities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Brak obcych polis wygasających w tym okresie
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Firma</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Składka</TableHead>
                      <TableHead>Wygasa</TableHead>
                      <TableHead className="text-right">Dni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foreignOpportunities.map((policy) => {
                      const daysLeft = differenceInDays(new Date(policy.end_date), new Date());
                      const isUrgent = daysLeft <= 30;

                      return (
                        <TableRow key={policy.id}>
                          <TableCell>
                            {policy.company ? (
                              <Link
                                to={`/companies/${policy.company.id}`}
                                className="flex items-center gap-1 hover:text-primary"
                              >
                                <Building2 className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">
                                  {policy.company.short_name || policy.company.name}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: POLICY_TYPE_COLORS[policy.policy_type as PolicyType],
                                color: POLICY_TYPE_COLORS[policy.policy_type as PolicyType],
                              }}
                            >
                              {POLICY_TYPE_LABELS[policy.policy_type as PolicyType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {policy.premium ? formatCurrency(policy.premium) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(policy.end_date), 'dd.MM.yyyy')}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${isUrgent ? 'text-destructive' : ''}`}>
                            {daysLeft}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
