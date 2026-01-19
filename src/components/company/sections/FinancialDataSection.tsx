import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp, Trophy, RefreshCw, Loader2 } from 'lucide-react';
import type { SectionProps } from '../types';

interface FinancialDataSectionProps extends SectionProps {
  onUpdateRevenue?: () => void;
  isUpdatingRevenue?: boolean;
}

export function FinancialDataSection({ data, onUpdateRevenue, isUpdatingRevenue }: FinancialDataSectionProps) {
  const revenueHistory = data.revenue_history || [];
  const rankingPositions = data.ranking_positions || [];
  
  const hasData = data.revenue?.amount || data.employee_count || data.market_position || revenueHistory.length > 0;

  if (!hasData) return null;

  // Calculate max revenue for chart scaling
  const maxRevenue = revenueHistory.length > 0 
    ? Math.max(...revenueHistory.map(r => r.amount))
    : 0;

  return (
    <SectionCard
      icon={<DollarSign className="h-4 w-4" />}
      title="Dane finansowe i rynkowe"
      action={
        onUpdateRevenue && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onUpdateRevenue} 
            disabled={isUpdatingRevenue}
            className="h-7 text-xs"
          >
            {isUpdatingRevenue ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Aktualizuj przychod
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {/* Key metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Revenue */}
          {data.revenue?.amount && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Przychody ({data.revenue.year})</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {(data.revenue.amount / 1_000_000).toFixed(1)}M PLN
                </p>
                {data.growth_rate && (
                  <Badge variant="outline" className="mt-1 text-green-600 border-green-300">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{data.growth_rate}% YoY
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Employee count */}
          {data.employee_count && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Zatrudnienie
                </p>
                <p className="text-2xl font-bold">{data.employee_count}</p>
                {data.employee_growth && (
                  <p className="text-xs text-muted-foreground mt-1">{data.employee_growth}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Market position */}
          {data.market_position && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Pozycja rynkowa</p>
                <p className="text-sm font-medium mt-1">{data.market_position}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Revenue history chart */}
        {revenueHistory.length > 1 && (
          <SectionBox title="Historia przychodów">
            <div className="flex items-end gap-2 h-24 pt-2">
              {revenueHistory.map((rev, i) => (
                <div key={i} className="flex flex-col items-center flex-1 max-w-16">
                  <div 
                    className="bg-primary/80 hover:bg-primary rounded-t w-full transition-colors"
                    style={{ 
                      height: `${(rev.amount / maxRevenue) * 70}px`,
                      minHeight: '8px'
                    }}
                    title={`${(rev.amount / 1_000_000).toFixed(1)}M PLN`}
                  />
                  <span className="text-[10px] mt-1 text-muted-foreground">{rev.year}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {(rev.amount / 1_000_000).toFixed(0)}M
                  </span>
                  {rev.growth_pct !== undefined && (
                    <span className={`text-[10px] ${rev.growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rev.growth_pct > 0 ? '+' : ''}{rev.growth_pct}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Market share */}
        {data.market_share_info && (
          <SectionBox title="Udział w rynku">
            <p className="text-sm text-muted-foreground">{data.market_share_info}</p>
          </SectionBox>
        )}

        {/* Ranking positions */}
        {rankingPositions.length > 0 && (
          <SectionBox title="Pozycje w rankingach" icon={<Trophy className="h-3 w-3" />}>
            <div className="flex flex-wrap gap-2">
              {rankingPositions.map((rank, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <span className="font-bold mr-1">#{rank.position}</span>
                  {rank.ranking_name} ({rank.year})
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}
