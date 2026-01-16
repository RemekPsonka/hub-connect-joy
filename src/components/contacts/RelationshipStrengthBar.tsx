import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RelationshipStrengthBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function RelationshipStrengthBar({ value, className, showLabel = false }: RelationshipStrengthBarProps) {
  const normalizedValue = Math.max(1, Math.min(10, value || 5));
  const percentage = normalizedValue * 10;

  const getColorClass = () => {
    if (normalizedValue <= 3) return 'bg-destructive';
    if (normalizedValue <= 6) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center gap-2', className)}>
          <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', getColorClass())}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {showLabel && (
            <span className="text-sm text-muted-foreground font-medium min-w-[2rem]">
              {normalizedValue}/10
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Siła relacji: {normalizedValue}/10</p>
      </TooltipContent>
    </Tooltip>
  );
}
