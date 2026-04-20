import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Temperature } from '@/types/dealTeam';

const STYLES: Record<Temperature, { className: string; label: string }> = {
  hot: { className: 'bg-red-500/15 text-red-700 border-red-300', label: 'HOT' },
  top: { className: 'bg-violet-500/15 text-violet-700 border-violet-300', label: 'TOP' },
  cold: { className: 'bg-slate-500/15 text-slate-700 border-slate-300', label: 'COLD' },
  '10x': { className: 'bg-amber-500/15 text-amber-700 border-amber-300', label: '10x' },
};

interface TemperatureBadgeProps {
  value: Temperature | string | null | undefined;
}

export function TemperatureBadge({ value }: TemperatureBadgeProps) {
  if (!value) return null;
  const s = STYLES[value as Temperature];
  if (!s) return null;
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', s.className)}>
      {s.label}
    </Badge>
  );
}
