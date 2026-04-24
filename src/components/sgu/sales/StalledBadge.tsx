import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StalledBadgeProps {
  stageLabel: string;
  daysSinceUpdate: number;
}

export function StalledBadge({ stageLabel, daysSinceUpdate }: StalledBadgeProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500 text-white"
            aria-label="Kontakt bez planowanej akcji"
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