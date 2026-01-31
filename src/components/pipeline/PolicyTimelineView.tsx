import { useMemo } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { POLICY_TYPE_LABELS, POLICY_TYPE_COLORS, type PolicyType } from '@/components/renewal/types';
import type { PolicyWithCompany } from '@/hooks/useAllPolicies';

interface PolicyTimelineViewProps {
  policies: PolicyWithCompany[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PolicyTimelineView({ policies }: PolicyTimelineViewProps) {
  const byMonth = useMemo(() => {
    const grouped = new Map<string, PolicyWithCompany[]>();

    policies.forEach(p => {
      const month = format(new Date(p.end_date), 'yyyy-MM');
      if (!grouped.has(month)) grouped.set(month, []);
      grouped.get(month)!.push(p);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12); // Pokaż najbliższe 12 miesięcy
  }, [policies]);

  const byType = useMemo(() => {
    const counts: Record<string, number> = {};
    policies.forEach(p => {
      counts[p.policy_type] = (counts[p.policy_type] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [policies]);

  const maxCount = Math.max(...byType.map(([, count]) => count), 1);

  if (policies.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Brak polis do wyświetlenia</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-1">
        {/* Rozkład wg typu polisy */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">
            Podział wg typu polisy
          </h3>
          <div className="space-y-2">
            {byType.map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="w-16 text-xs text-muted-foreground truncate">
                  {POLICY_TYPE_LABELS[type as PolicyType]}
                </span>
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: POLICY_TYPE_COLORS[type as PolicyType],
                    }}
                  />
                </div>
                <span className="text-xs font-medium w-6 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Harmonogram wg miesiąca */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">
            Wygasające wg miesiąca
          </h3>
          <div className="space-y-2">
            {byMonth.map(([month, monthPolicies]) => {
              const totalPremium = monthPolicies.reduce((sum, p) => sum + (p.premium || 0), 0);
              const ourCount = monthPolicies.filter(p => p.is_our_policy).length;

              return (
                <Card key={month} className="overflow-hidden">
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-medium">
                        {format(new Date(month + '-01'), 'LLLL yyyy', { locale: pl })}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {monthPolicies.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-3 pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(totalPremium)} PLN</span>
                      {ourCount > 0 && (
                        <span className="text-primary font-medium">
                          {ourCount} nasza
                        </span>
                      )}
                    </div>
                    {/* Mini paski typów */}
                    <div className="flex gap-0.5 mt-2 h-1.5 rounded overflow-hidden">
                      {monthPolicies.map((p, i) => (
                        <div
                          key={i}
                          className="flex-1"
                          style={{
                            backgroundColor: POLICY_TYPE_COLORS[p.policy_type as PolicyType],
                          }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
