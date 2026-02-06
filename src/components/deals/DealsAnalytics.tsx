import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeals, useDealStages, Deal } from '@/hooks/useDeals';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Scale, Trophy, Clock, TrendingUp, Loader2 } from 'lucide-react';

interface ForecastDataPoint {
  month: string;
  expected: number;
  deals: number;
}

interface FunnelDataPoint {
  name: string;
  color: string;
  count: number;
  value: number;
  percentage: number;
}

export function DealsAnalytics() {
  const { data: openDealsData, isLoading: openLoading } = useDeals({ status: 'open', pageSize: 1000 });
  const { data: wonDealsData, isLoading: wonLoading } = useDeals({ status: 'won', pageSize: 1000 });
  const { data: lostDealsData, isLoading: lostLoading } = useDeals({ status: 'lost', pageSize: 1000 });
  const { data: stages = [], isLoading: stagesLoading } = useDealStages();

  const openDeals = openDealsData?.data || [];
  const wonDeals = wonDealsData?.data || [];
  const lostDeals = lostDealsData?.data || [];
  const allOpenDeals = openDeals;

  const isLoading = openLoading || wonLoading || lostLoading || stagesLoading;

  // Weighted Pipeline (value × probability)
  const weightedValue = useMemo(() => {
    return allOpenDeals.reduce((sum, deal) => {
      return sum + (deal.value * (deal.probability / 100));
    }, 0);
  }, [allOpenDeals]);

  // Win Rate
  const winRate = useMemo(() => {
    const total = wonDeals.length + lostDeals.length;
    if (total === 0) return 0;
    return Math.round((wonDeals.length / total) * 100);
  }, [wonDeals, lostDeals]);

  // Average Days to Close (based on won deals)
  const avgDaysToClose = useMemo(() => {
    if (wonDeals.length === 0) return 0;
    
    const totalDays = wonDeals.reduce((sum, deal) => {
      const created = new Date(deal.created_at);
      const won = deal.won_at ? new Date(deal.won_at) : new Date();
      const diffTime = Math.abs(won.getTime() - created.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);
    
    return Math.round(totalDays / wonDeals.length);
  }, [wonDeals]);

  // 6-Month Forecast
  const forecastData = useMemo<ForecastDataPoint[]>(() => {
    const now = new Date();
    const months: ForecastDataPoint[] = [];

    for (let i = 0; i < 6; i++) {
      const month = new Date(now);
      month.setMonth(month.getMonth() + i);

      const dealsThisMonth = allOpenDeals.filter((deal) => {
        if (!deal.expected_close_date) return false;
        const closeDate = new Date(deal.expected_close_date);
        return closeDate.getMonth() === month.getMonth() &&
               closeDate.getFullYear() === month.getFullYear();
      });

      const expectedValue = dealsThisMonth.reduce((sum, deal) => {
        return sum + (deal.value * (deal.probability / 100));
      }, 0);

      months.push({
        month: month.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' }),
        expected: Math.round(expectedValue),
        deals: dealsThisMonth.length,
      });
    }

    return months;
  }, [allOpenDeals]);

  // Conversion Funnel - deals by stage
  const funnelData = useMemo<FunnelDataPoint[]>(() => {
    // Filter only active, non-closed stages and sort by position
    const activeStages = stages
      .filter(s => !s.is_closed_won && !s.is_closed_lost)
      .sort((a, b) => a.position - b.position);
    
    if (activeStages.length === 0) return [];
    
    const maxCount = Math.max(
      ...activeStages.map(stage => 
        allOpenDeals.filter(d => d.stage_id === stage.id).length
      ),
      1
    );

    return activeStages.map(stage => {
      const dealsInStage = allOpenDeals.filter(d => d.stage_id === stage.id);
      const count = dealsInStage.length;
      const value = dealsInStage.reduce((sum, d) => sum + d.value, 0);
      
      return {
        name: stage.name,
        color: stage.color,
        count,
        value,
        percentage: Math.round((count / maxCount) * 100),
      };
    });
  }, [allOpenDeals, stages]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(weightedValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Wartość × prawdopodobieństwo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {wonDeals.length} wygranych / {lostDeals.length} przegranych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days to Close</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDaysToClose} dni</div>
            <p className="text-xs text-muted-foreground mt-1">
              Na podstawie wygranych deals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 6-Month Forecast Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            6-Month Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forecastData.every(d => d.expected === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Brak deals z oczekiwaną datą zamknięcia w najbliższych 6 miesiącach</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Oczekiwany przychód']}
                  labelFormatter={(label) => `Miesiąc: ${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="expected" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Oczekiwany przychód"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Brak danych do wyświetlenia funnela</p>
            </div>
          ) : (
            <div className="space-y-3">
              {funnelData.map((stage) => (
                <div key={stage.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.name}</span>
                    <span className="text-muted-foreground">
                      {stage.count} deals • {formatCurrency(stage.value)}
                    </span>
                  </div>
                  <div className="h-8 bg-muted rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max(stage.percentage, 5)}%`,
                        backgroundColor: stage.color,
                      }}
                    >
                      <span className="text-xs font-medium text-white drop-shadow-sm">
                        {stage.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
