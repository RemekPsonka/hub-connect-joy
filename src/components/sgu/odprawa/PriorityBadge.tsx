import { Badge } from '@/components/ui/badge';
import { Flame, HelpCircle, Pause, Snowflake, Star, Zap } from 'lucide-react';

interface Props {
  bucket: number;
}

const META: Record<number, { label: string; cls: string; Icon: typeof Zap }> = {
  1: { label: '10x', cls: 'bg-destructive/15 text-destructive border-destructive/40', Icon: Zap },
  2: { label: 'Pytania', cls: 'bg-accent text-accent-foreground border-border', Icon: HelpCircle },
  3: { label: 'Zalega', cls: 'bg-destructive/10 text-destructive border-destructive/30', Icon: Pause },
  4: { label: 'Hot', cls: 'bg-destructive/15 text-destructive border-destructive/40', Icon: Flame },
  5: { label: 'Top', cls: 'bg-primary/15 text-primary border-primary/40', Icon: Star },
  6: { label: 'Reszta', cls: 'bg-muted text-muted-foreground border-border', Icon: Snowflake },
};

export function PriorityBadge({ bucket }: Props) {
  const m = META[bucket] ?? META[6];
  const Icon = m.Icon;
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls}`}>
      <Icon className="h-3 w-3" />
      {m.label}
    </Badge>
  );
}