import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Currency } from './types';
import { CURRENCY_SYMBOLS } from './types';

interface TerritorialSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  totalRevenue: number;
  currency: Currency;
  color: string;
  isDanger?: boolean;
  disabled?: boolean;
}

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B ${symbol}`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M ${symbol}`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K ${symbol}`;
  }
  return `${amount.toFixed(0)} ${symbol}`;
}

export function TerritorialSlider({
  label,
  value,
  onChange,
  totalRevenue,
  currency,
  color,
  isDanger = false,
  disabled = false,
}: TerritorialSliderProps) {
  const calculatedAmount = (totalRevenue * value) / 100;
  const isActive = value > 0;

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all",
      isDanger && isActive && "border-red-500 bg-red-50 dark:bg-red-950/30",
      !isDanger && "border-border"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "font-medium text-sm",
          isDanger && isActive && "text-red-600 dark:text-red-400"
        )}>
          {isDanger && isActive && "🔴 "}{label}
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            className={cn(
              "w-16 h-8 text-right text-sm",
              isDanger && isActive && "border-red-500"
            )}
            disabled={disabled}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>
      
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={100}
        step={1}
        disabled={disabled}
        className={cn(
          "my-2",
          isDanger && isActive && "[&_[role=slider]]:border-red-500 [&_.bg-primary]:bg-red-500"
        )}
        style={{
          '--slider-color': isDanger && isActive ? 'hsl(0, 84%, 60%)' : color,
        } as React.CSSProperties}
      />
      
      <div className={cn(
        "text-xs",
        isDanger && isActive ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
      )}>
        = {formatCurrency(calculatedAmount, currency)}
        {isDanger && isActive && " ← DANGER!"}
      </div>
    </div>
  );
}
