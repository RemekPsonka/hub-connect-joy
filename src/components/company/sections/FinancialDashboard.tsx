import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionCard, SectionBox } from '../SectionCard';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Truck, 
  Warehouse,
  RefreshCw,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import type { CompanyAnalysis, FinancialStatement, RevenueHistory } from '../types';

interface FinancialDashboardProps {
  data: CompanyAnalysis;
  onUpdateRevenue?: () => void;
  isUpdatingRevenue?: boolean;
}

// Format currency values
function formatCurrency(amount: number | undefined, short = false): string {
  if (!amount) return '-';
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(short ? 1 : 2)} mld PLN`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(short ? 0 : 1)} mln PLN`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} tys. PLN`;
  }
  return `${amount} PLN`;
}

// Format percentage with sign
function formatPercent(value: number | undefined): string {
  if (value === undefined || value === null) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  colorClass = 'text-foreground',
  bgClass = 'bg-card'
}: { 
  title: string; 
  value: string; 
  change?: number; 
  icon: React.ElementType;
  colorClass?: string;
  bgClass?: string;
}) {
  return (
    <Card className={`${bgClass} border`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Icon className="h-3 w-3" />
              {title}
            </p>
            <p className={`text-xl font-bold mt-1 ${colorClass}`}>{value}</p>
          </div>
          {change !== undefined && (
            <Badge 
              variant="outline" 
              className={`text-xs ${change >= 0 ? 'text-green-600 border-green-300 bg-green-50' : 'text-red-600 border-red-300 bg-red-50'}`}
            >
              {change >= 0 ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
              )}
              {formatPercent(change)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialDashboard({ 
  data, 
  onUpdateRevenue, 
  isUpdatingRevenue 
}: FinancialDashboardProps) {
  const revenueHistory: RevenueHistory[] = data.revenue_history || [];
  const financialStatements: FinancialStatement[] = data.financial_statements || [];
  const rankingPositions = data.ranking_positions || [];
  
  // Get latest financial data
  const latestRevenue = data.revenue?.amount;
  const latestYear = data.revenue?.year;
  
  // Calculate YoY growth
  const currentYearData = revenueHistory.find(r => r.year === latestYear);
  const prevYearData = revenueHistory.find(r => r.year === (latestYear || 0) - 1);
  const yoyGrowth = currentYearData?.growth_pct || data.growth_rate;
  
  // Prepare chart data - combine revenue history with financial statements
  const chartData = revenueHistory.length > 0 
    ? revenueHistory.map(r => ({
        year: r.year,
        revenue: r.amount / 1_000_000,
        growth: r.growth_pct || 0,
        profit: financialStatements.find(f => f.year === r.year)?.net_profit 
          ? (financialStatements.find(f => f.year === r.year)?.net_profit || 0) / 1_000_000
          : undefined,
        ebitda: financialStatements.find(f => f.year === r.year)?.ebitda
          ? (financialStatements.find(f => f.year === r.year)?.ebitda || 0) / 1_000_000
          : undefined
      }))
    : financialStatements.map(f => ({
        year: f.year,
        revenue: f.revenue ? f.revenue / 1_000_000 : undefined,
        profit: f.net_profit ? f.net_profit / 1_000_000 : undefined,
        ebitda: f.ebitda ? f.ebitda / 1_000_000 : undefined,
        growth: 0
      }));

  // Get employee info
  const employeeCount = typeof data.employee_count === 'string' 
    ? parseInt(data.employee_count) 
    : data.employee_count;

  // Check if we have meaningful data
  const hasData = latestRevenue || revenueHistory.length > 0 || 
    financialStatements.length > 0 || data.employee_count || 
    data.market_position || data.fleet_size;

  if (!hasData) {
    return null;
  }

  return (
    <SectionCard
      icon={<BarChart3 className="h-4 w-4" />}
      title="Dashboard finansowy"
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
            Aktualizuj dane
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Revenue */}
          <KPICard 
            title={`Przychody ${latestYear || ''}`}
            value={formatCurrency(latestRevenue || undefined)}
            change={yoyGrowth}
            icon={DollarSign}
            colorClass="text-green-600 dark:text-green-400"
            bgClass="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
          />
          
          {/* Net Profit - if available */}
          {financialStatements.length > 0 && financialStatements[0]?.net_profit && (
            <KPICard 
              title={`Zysk netto ${financialStatements[0].year}`}
              value={formatCurrency(financialStatements[0].net_profit)}
              icon={TrendingUp}
              colorClass="text-blue-600 dark:text-blue-400"
              bgClass="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
            />
          )}
          
          {/* EBITDA - if available */}
          {financialStatements.length > 0 && financialStatements[0]?.ebitda && (
            <KPICard 
              title={`EBITDA ${financialStatements[0].year}`}
              value={formatCurrency(financialStatements[0].ebitda)}
              icon={PieChartIcon}
              colorClass="text-purple-600 dark:text-purple-400"
              bgClass="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20"
            />
          )}
          
          {/* Employee Count */}
          {employeeCount && (
            <KPICard 
              title="Zatrudnienie"
              value={employeeCount.toLocaleString('pl-PL')}
              icon={Users}
            />
          )}
          
          {/* Fleet size (for transport companies) */}
          {data.fleet_size && (
            <KPICard 
              title="Flota pojazdów"
              value={data.fleet_size.toLocaleString('pl-PL')}
              icon={Truck}
            />
          )}
          
          {/* Warehouse area (for logistics companies) */}
          {data.warehouse_area_sqm && (
            <KPICard 
              title="Pow. magazynowa"
              value={`${(data.warehouse_area_sqm / 1000).toFixed(0)} tys. m²`}
              icon={Warehouse}
            />
          )}
        </div>

        {/* Revenue Trend Chart */}
        {chartData.length > 1 && (
          <SectionBox title="Dynamika finansowa" icon={<TrendingUp className="h-3 w-3" />}>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                    tickFormatter={(value) => `${value}M`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'growth') return [`${value.toFixed(1)}%`, 'Wzrost r/r'];
                      return [`${value.toFixed(1)} mln PLN`, name === 'revenue' ? 'Przychód' : name === 'profit' ? 'Zysk netto' : 'EBITDA'];
                    }}
                    labelFormatter={(label) => `Rok ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    formatter={(value) => {
                      switch(value) {
                        case 'revenue': return 'Przychód';
                        case 'profit': return 'Zysk netto';
                        case 'ebitda': return 'EBITDA';
                        case 'growth': return 'Wzrost %';
                        default: return value;
                      }
                    }}
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    fill="hsl(var(--primary) / 0.2)" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  {chartData.some(d => d.profit !== undefined) && (
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="profit" 
                      stroke="hsl(142 76% 36%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(142 76% 36%)' }}
                    />
                  )}
                  {chartData.some(d => d.ebitda !== undefined) && (
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="ebitda" 
                      stroke="hsl(262 83% 58%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(262 83% 58%)' }}
                    />
                  )}
                  <Bar 
                    yAxisId="right"
                    dataKey="growth" 
                    fill="hsl(var(--muted))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </SectionBox>
        )}

        {/* Simple bar chart if only 1 year or only revenue */}
        {chartData.length === 1 && revenueHistory.length > 0 && (
          <SectionBox title="Przychody" icon={<BarChart3 className="h-3 w-3" />}>
            <div className="flex items-end gap-3 h-24">
              {revenueHistory.map((rev, i) => (
                <div key={i} className="flex flex-col items-center flex-1 max-w-20">
                  <div 
                    className="bg-primary/80 hover:bg-primary rounded-t w-full transition-colors"
                    style={{ 
                      height: `${Math.max(20, 70)}px`,
                      minHeight: '20px'
                    }}
                    title={formatCurrency(rev.amount)}
                  />
                  <span className="text-xs mt-1 text-muted-foreground">{rev.year}</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatCurrency(rev.amount, true)}
                  </span>
                </div>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Financial Statements Table */}
        {financialStatements.length > 0 && (
          <SectionBox title="Sprawozdania finansowe">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Rok</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Przychody</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Zysk netto</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">EBITDA</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Aktywa</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Zatrudnienie</th>
                  </tr>
                </thead>
                <tbody>
                  {financialStatements.slice(0, 5).map((stmt, i) => (
                    <tr key={i} className="border-b border-muted/50 hover:bg-muted/30">
                      <td className="py-2 font-medium">{stmt.year}</td>
                      <td className="text-right py-2">{formatCurrency(stmt.revenue, true)}</td>
                      <td className="text-right py-2">
                        {stmt.net_profit !== undefined && (
                          <span className={stmt.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(stmt.net_profit, true)}
                          </span>
                        )}
                      </td>
                      <td className="text-right py-2">{formatCurrency(stmt.ebitda, true)}</td>
                      <td className="text-right py-2">{formatCurrency(stmt.total_assets, true)}</td>
                      <td className="text-right py-2">{stmt.employee_count || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {financialStatements[0]?.source && (
              <p className="text-xs text-muted-foreground mt-2">
                Źródło: {financialStatements[0].source === 'krs_statement' ? 'Sprawozdanie KRS' : financialStatements[0].source}
              </p>
            )}
          </SectionBox>
        )}

        {/* Market Position & Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.market_position && (
            <SectionBox title="Pozycja rynkowa">
              <p className="text-sm text-muted-foreground">{data.market_position}</p>
            </SectionBox>
          )}
          
          {data.market_share_info && (
            <SectionBox title="Udział w rynku">
              <p className="text-sm text-muted-foreground">{data.market_share_info}</p>
            </SectionBox>
          )}
        </div>

        {/* Rankings */}
        {rankingPositions.length > 0 && (
          <SectionBox title="Pozycje w rankingach">
            <div className="flex flex-wrap gap-2">
              {rankingPositions.map((rank, i) => (
                <Badge key={i} variant="secondary" className="text-xs py-1 px-2">
                  <span className="font-bold text-primary mr-1">#{rank.position}</span>
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
