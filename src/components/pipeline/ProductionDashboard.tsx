import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductionKPICards } from './ProductionKPICards';
import { ProductionKPIEditor } from './ProductionKPIEditor';
import { ProductionChart } from './ProductionChart';
import { ProductionTable } from './ProductionTable';
import { ProductionByCategory } from './ProductionByCategory';
import { RenewalPotentialAnalysis } from './RenewalPotentialAnalysis';
import { usePipelineKPI } from '@/hooks/usePipelineKPI';
import type { PeriodType } from '@/hooks/useRenewalPotential';

const PERIOD_LABELS: Record<PeriodType, string> = {
  year: 'Rok',
  quarter: 'Kwartał',
  month: 'Miesiąc',
};

export function ProductionDashboard() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const [year, setYear] = useState(currentYear);
  const [period, setPeriod] = useState<PeriodType>('year');
  const [periodIndex, setPeriodIndex] = useState(1);

  const { yearlyTarget } = usePipelineKPI(year);

  const getMaxPeriodIndex = () => {
    switch (period) {
      case 'month':
        return 12;
      case 'quarter':
        return 4;
      default:
        return 1;
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'month':
        const months = [
          'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
          'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
        ];
        return months[periodIndex - 1];
      case 'quarter':
        return `Q${periodIndex}`;
      default:
        return '';
    }
  };

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    if (newPeriod === 'month') {
      setPeriodIndex(currentMonth);
    } else if (newPeriod === 'quarter') {
      setPeriodIndex(currentQuarter);
    } else {
      setPeriodIndex(1);
    }
  };

  const handlePrevPeriod = () => {
    if (periodIndex > 1) {
      setPeriodIndex(periodIndex - 1);
    } else if (period !== 'year') {
      setYear(year - 1);
      setPeriodIndex(getMaxPeriodIndex());
    } else {
      setYear(year - 1);
    }
  };

  const handleNextPeriod = () => {
    if (period === 'year') {
      setYear(year + 1);
    } else if (periodIndex < getMaxPeriodIndex()) {
      setPeriodIndex(periodIndex + 1);
    } else {
      setYear(year + 1);
      setPeriodIndex(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between bg-card border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-[120px] justify-center">
              <span className="font-semibold">{year}</span>
              {period !== 'year' && (
                <span className="text-muted-foreground">• {getPeriodLabel()}</span>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Tabs value={period} onValueChange={(v) => handlePeriodChange(v as PeriodType)}>
            <TabsList className="h-8">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="text-xs px-3">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <ProductionKPIEditor year={year} />
      </div>

      {/* KPI Cards */}
      <ProductionKPICards year={year} />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - takes 2 columns */}
        <div className="lg:col-span-2">
          <ProductionChart year={year} />
        </div>

        {/* Renewal potential */}
        <div className="lg:col-span-1">
          <RenewalPotentialAnalysis
            year={year}
            period={period}
            periodIndex={periodIndex}
            yearlyTarget={yearlyTarget?.target_premium || 0}
          />
        </div>
      </div>

      {/* Production table */}
      <ProductionTable year={year} />

      {/* Production by category */}
      <ProductionByCategory year={year} />
    </div>
  );
}
