import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Flame, AlertTriangle, Clock, Circle } from 'lucide-react';

const CONFIG = {
  '10x': { label: '10x', icon: Flame, className: 'bg-destructive/15 text-destructive border-destructive/30' },
  stalled: { label: 'Utknął', icon: AlertTriangle, className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400' },
  due_soon: { label: 'Pilne', icon: Clock, className: 'bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-400' },
  other: { label: 'Inne', icon: Circle, className: 'bg-muted text-muted-foreground border-border' },
} as const;

type Bucket = keyof typeof CONFIG;

export function PriorityBadge({ bucket }: { bucket: string }) {
  const cfg = CONFIG[(bucket as Bucket)] ?? CONFIG.other;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', cfg.className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
