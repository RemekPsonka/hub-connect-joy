import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SectionProgressBadgeProps {
  filled: number;
  total: number;
}

export function SectionProgressBadge({ filled, total }: SectionProgressBadgeProps) {
  const isComplete = filled >= total;
  const hasProgress = filled > 0;

  return (
    <Badge
      variant="outline"
      className={`ml-2 text-xs font-normal ${
        isComplete
          ? 'border-green-500/50 text-green-600 bg-green-50 dark:bg-green-950/30'
          : hasProgress
          ? 'border-primary/30 text-primary/80'
          : 'border-border text-muted-foreground'
      }`}
    >
      {isComplete && <CheckCircle className="h-3 w-3 mr-1" />}
      {filled}/{total}
    </Badge>
  );
}

/** Count non-empty fields in a data object */
export function countFilledFields(data: Record<string, any> | undefined | null, fields: string[]): number {
  if (!data) return 0;
  return fields.filter((f) => {
    const val = data[f];
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'object' && !Array.isArray(val)) {
      return Object.values(val).some((v) => v !== undefined && v !== null && v !== '');
    }
    return true;
  }).length;
}
