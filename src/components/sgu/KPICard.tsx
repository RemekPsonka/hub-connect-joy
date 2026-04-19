import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KPICardVariant = 'default' | 'success' | 'warning';

interface KPICardProps {
  label: string;
  value: number | string;
  delta?: number | null;
  deltaSuffix?: string;
  icon: LucideIcon;
  variant?: KPICardVariant;
  loading?: boolean;
}

const variantMap: Record<KPICardVariant, string> = {
  default: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
};

export function KPICard({
  label,
  value,
  delta,
  deltaSuffix = 'vs poprzedni tydzień',
  icon: Icon,
  variant = 'default',
  loading,
}: KPICardProps) {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const trendIcon = !hasDelta ? Minus : delta! > 0 ? TrendingUp : delta! < 0 ? TrendingDown : Minus;
  const TrendIcon = trendIcon;

  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
          {loading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded-md mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground">{value}</p>
          )}
          {hasDelta && !loading && (
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon
                className={cn(
                  'h-3.5 w-3.5',
                  delta! > 0 ? 'text-success' : delta! < 0 ? 'text-destructive' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  delta! > 0 ? 'text-success' : delta! < 0 ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {delta! > 0 ? '+' : ''}
                {delta}%
              </span>
              <span className="text-xs text-muted-foreground">{deltaSuffix}</span>
            </div>
          )}
        </div>
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', variantMap[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
