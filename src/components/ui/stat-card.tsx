import { type LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatCardColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'red';

const iconColorMap: Record<StatCardColor, string> = {
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
};

interface StatCardProps {
  /** Display label. Alias: `title` (kept for backward compat) */
  label?: string;
  /** @deprecated Use `label` instead */
  title?: string;
  value: number | string;
  icon: LucideIcon;
  loading?: boolean;
  trend?: {
    value: number;
    label?: string;
  };
  color?: StatCardColor;
  className?: string;
}

export function StatCard({
  label,
  title,
  value,
  icon: Icon,
  loading,
  trend,
  color = 'violet',
  className,
}: StatCardProps) {
  const displayLabel = label ?? title ?? '';

  return (
    <div
      className={cn(
        'bg-card rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{displayLabel}</p>
          {loading ? (
            <div className="h-8 w-20 bg-muted animate-pulse rounded-md mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground">{value}</p>
          )}
          {trend && !loading && (
            <div className="flex items-center gap-1 mt-1">
              {trend.value >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.value >= 0 ? 'text-success' : 'text-destructive',
                )}
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
            iconColorMap[color],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
