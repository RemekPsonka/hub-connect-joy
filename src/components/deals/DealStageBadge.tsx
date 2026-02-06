import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DealStageBadgeProps {
  name: string;
  color: string;
  className?: string;
}

export function DealStageBadge({ name, color, className }: DealStageBadgeProps) {
  return (
    <Badge
      className={cn('font-medium', className)}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
      }}
      variant="outline"
    >
      {name}
    </Badge>
  );
}
