import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StalledBadgeProps {
  stageLabel: string;
  daysSinceUpdate: number;
  onClick?: (e: React.MouseEvent) => void;
}

export function StalledBadge({ stageLabel, daysSinceUpdate, onClick }: StalledBadgeProps) {
  const isClickable = !!onClick;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500 text-white',
              isClickable && 'cursor-pointer hover:bg-amber-600 transition-colors',
            )}
            aria-label="Kontakt bez planowanej akcji"
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={onClick}
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClick?.(e as unknown as React.MouseEvent);
                    }
                  }
                : undefined
            }
          >
            <AlertTriangle className="h-3 w-3" />
            Bez akcji
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          Etap <strong>{stageLabel}</strong>
          {daysSinceUpdate > 0 ? ` od ${daysSinceUpdate} dni` : ''} bez zaplanowanej akcji.
          Dodaj zadanie lub ustaw next action.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}