import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  RefreshCw, Loader2, DollarSign, TrendingUp, TrendingDown,
  Users, Building, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FinancialDataViewerProps {
  data: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShortCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '-';
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)} mld PLN`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} mln PLN`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)} tys. PLN`;
  }
  return formatCurrency(amount);
}

function getTrendIcon(current: number | undefined, previous: number | undefined) {
  if (!current || !previous) return <Minus className="h-4 w-4 text-muted-foreground" />;
  if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
  if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function FinancialDataViewer({ data, onRefresh, isRefreshing }: FinancialDataViewerProps) {
  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Brak danych finansowych</p>
        {onRefresh && (
          <Button className="mt-4" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
            Pobierz dane
          </Button>
        )}
      </div>
    );
  }

  // Extract years data (different possible structures)
  const yearsData = data.years || data.financial_years || [];
  const year2024 = yearsData.find((y: any) => y.year === 2024) || data.year_2024;
  const year2023 = yearsData.find((y: any) => y.year === 2023) || data.year_2023;
  const year2022 = yearsData.find((y: any) => y.year === 2022) || data.year_2022;
  
  const latestYear = year2024 || year2023 || yearsData[0];
  const cagr = data.revenue_cagr || data.cagr;
  const healthIndicator = data.financial_health || data.health;

  const getHealthBadge = (health: string | undefined) => {
    switch (health?.toLowerCase()) {
      case 'excellent':
      case 'very_good':
        return <Badge className="bg-green-500">Doskonała</Badge>;
      case 'good':
      case 'stable':
        return <Badge className="bg-blue-500">Dobra</Badge>;
      case 'moderate':
      case 'average':
        return <Badge className="bg-yellow-500">Średnia</Badge>;
      case 'poor':
      case 'weak':
        return <Badge variant="destructive">Słaba</Badge>;
      default:
        return <Badge variant="outline">{health || 'Nieznana'}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Dane finansowe (3 lata)</h3>
          {healthIndicator && getHealthBadge(healthIndicator)}
        </div>
        {onRefresh && (
          <Button size="sm" variant="ghost" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Key Metrics Cards */}
      {latestYear && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Przychody</span>
              </div>
              <p className="text-lg font-bold mt-1">
                {formatShortCurrency(latestYear.revenue)}
              </p>
              <div className="flex items-center gap-1 text-xs mt-1">
                {getTrendIcon(latestYear.revenue, year2023?.revenue || year2022?.revenue)}
                <span className="text-muted-foreground">{latestYear.year}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Zysk netto</span>
              </div>
              <p className="text-lg font-bold mt-1">
                {formatShortCurrency(latestYear.net_profit)}
              </p>
              <div className="flex items-center gap-1 text-xs mt-1">
                {getTrendIcon(latestYear.net_profit, year2023?.net_profit)}
                <span className="text-muted-foreground">{latestYear.year}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Zatrudnienie</span>
              </div>
              <p className="text-lg font-bold mt-1">
                {latestYear.employees || latestYear.employee_count || '-'}
              </p>
              <div className="flex items-center gap-1 text-xs mt-1">
                {getTrendIcon(latestYear.employees, year2023?.employees)}
                <span className="text-muted-foreground">{latestYear.year}</span>
              </div>
            </CardContent>
          </Card>

          {cagr !== undefined && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  {cagr >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">CAGR</span>
                </div>
                <p className={`text-lg font-bold mt-1 ${cagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cagr > 0 ? '+' : ''}{cagr}%
                </p>
                <span className="text-xs text-muted-foreground">wzrost roczny</span>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Financial Table */}
      {yearsData.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Zestawienie roczne</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rok</TableHead>
                  <TableHead className="text-right">Przychody</TableHead>
                  <TableHead className="text-right">Zysk netto</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right">Zatrudnienie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearsData.map((year: any) => (
                  <TableRow key={year.year}>
                    <TableCell className="font-medium">{year.year}</TableCell>
                    <TableCell className="text-right">
                      {formatShortCurrency(year.revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={year.net_profit < 0 ? 'text-red-500' : ''}>
                        {formatShortCurrency(year.net_profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatShortCurrency(year.ebitda)}
                    </TableCell>
                    <TableCell className="text-right">
                      {year.employees || year.employee_count || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Additional metrics */}
      {(data.total_assets || data.equity || data.fleet_size) && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Dodatkowe wskaźniki</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {data.total_assets && (
                <div>
                  <p className="text-xs text-muted-foreground">Aktywa ogółem</p>
                  <p className="font-medium">{formatShortCurrency(data.total_assets)}</p>
                </div>
              )}
              {data.equity && (
                <div>
                  <p className="text-xs text-muted-foreground">Kapitał własny</p>
                  <p className="font-medium">{formatShortCurrency(data.equity)}</p>
                </div>
              )}
              {data.fleet_size && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Flota</p>
                    <p className="font-medium">{data.fleet_size} pojazdów</p>
                  </div>
                </div>
              )}
              {data.warehouse_area && (
                <div>
                  <p className="text-xs text-muted-foreground">Powierzchnia magazynowa</p>
                  <p className="font-medium">{data.warehouse_area.toLocaleString()} m²</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data sources */}
      {data.sources?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Źródła:</span>
          {data.sources.map((source: string, idx: number) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {source}
            </Badge>
          ))}
        </div>
      )}

      {/* Timestamp */}
      {data.fetched_at && (
        <p className="text-xs text-muted-foreground">
          Pobrano: {format(new Date(data.fetched_at), 'd MMM yyyy, HH:mm', { locale: pl })}
        </p>
      )}
    </div>
  );
}
