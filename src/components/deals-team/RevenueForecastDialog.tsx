import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useRevenueForecast, useSaveRevenueForecast, type ClientProduct } from '@/hooks/useTeamClients';
import { formatCurrency } from '@/lib/formatCurrency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface RevenueForecastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientProduct: ClientProduct;
}

export function RevenueForecastDialog({ open, onOpenChange, clientProduct }: RevenueForecastDialogProps) {
  const { data: existingForecasts = [] } = useRevenueForecast(clientProduct.id);
  const saveForecast = useSaveRevenueForecast();

  const [percentages, setPercentages] = useState<number[]>(Array(12).fill(0));

  // Initialize from existing
  useEffect(() => {
    const p = Array(12).fill(0);
    existingForecasts.forEach((f) => {
      if (f.month_offset >= 0 && f.month_offset < 12) {
        p[f.month_offset] = f.percentage;
      }
    });
    setPercentages(p);
  }, [existingForecasts]);

  const months = useMemo(() => {
    const now = startOfMonth(new Date());
    return Array.from({ length: 12 }, (_, i) => ({
      offset: i,
      date: addMonths(now, i),
      label: format(addMonths(now, i), 'LLLL yyyy', { locale: pl }),
    }));
  }, []);

  const totalPercent = percentages.reduce((s, v) => s + v, 0);
  const totalValue = clientProduct.deal_value;

  const handleSliderChange = (idx: number, value: number[]) => {
    const newPercentages = [...percentages];
    newPercentages[idx] = value[0];
    setPercentages(newPercentages);
  };

  const handleSave = async () => {
    const now = startOfMonth(new Date());
    const forecasts = percentages.map((pct, i) => ({
      monthOffset: i,
      monthDate: format(addMonths(now, i), 'yyyy-MM-dd'),
      amount: Math.round((totalValue * pct) / 100),
      percentage: pct,
    }));
    await saveForecast.mutateAsync({
      clientProductId: clientProduct.id,
      forecasts,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Prognoza: {clientProduct.category_name} — {formatCurrency(totalValue)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {months.map((m, i) => {
            const amount = Math.round((totalValue * percentages[i]) / 100);
            return (
              <div key={m.offset} className="grid grid-cols-[140px_1fr_60px_100px] items-center gap-3">
                <span className="text-sm capitalize truncate">{m.label}</span>
                <Slider
                  value={[percentages[i]]}
                  onValueChange={(v) => handleSliderChange(i, v)}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm text-right font-medium">{percentages[i]}%</span>
                <span className="text-xs text-muted-foreground text-right">{formatCurrency(amount)}</span>
              </div>
            );
          })}
        </div>

        <div className={`flex justify-between items-center p-3 rounded-lg border ${totalPercent === 100 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : totalPercent > 100 ? 'bg-destructive/10 border-destructive/30' : 'bg-muted'}`}>
          <span className="text-sm font-medium">Suma</span>
          <div className="text-right">
            <p className={`text-sm font-bold ${totalPercent === 100 ? 'text-emerald-600' : totalPercent > 100 ? 'text-destructive' : ''}`}>
              {totalPercent}% = {formatCurrency(Math.round((totalValue * totalPercent) / 100))}
            </p>
            {totalPercent !== 100 && (
              <p className="text-xs text-muted-foreground">
                {totalPercent < 100 ? `Pozostało ${100 - totalPercent}%` : `Przekroczono o ${totalPercent - 100}%`}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={handleSave} disabled={saveForecast.isPending}>
            {saveForecast.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Zapisz prognozę
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
