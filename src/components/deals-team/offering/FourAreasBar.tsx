import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';

interface FourAreasBarProps {
  propertyGr?: number;
  financialGr?: number;
  communicationGr?: number;
  lifeGroupGr?: number;
  className?: string;
}

const AREAS = [
  { key: 'property', icon: '🏠', label: 'Majątek' },
  { key: 'financial', icon: '💰', label: 'Finanse' },
  { key: 'communication', icon: '📞', label: 'Komunikacja' },
  { key: 'life_group', icon: '🏥', label: 'Życie/Grupa' },
] as const;

export function FourAreasBar({
  propertyGr = 0,
  financialGr = 0,
  communicationGr = 0,
  lifeGroupGr = 0,
  className,
}: FourAreasBarProps) {
  const values: Record<string, number> = {
    property: propertyGr,
    financial: financialGr,
    communication: communicationGr,
    life_group: lifeGroupGr,
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn('flex items-center gap-1', className)}>
        {AREAS.map((a) => {
          const gr = values[a.key] || 0;
          const active = gr > 0;
          return (
            <Tooltip key={a.key}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'text-sm leading-none transition-opacity',
                    active ? 'opacity-100' : 'opacity-30 grayscale'
                  )}
                  aria-label={a.label}
                >
                  {a.icon}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {a.label}
                {active ? <> · pot. {formatCompactCurrency(gr / 100)}</> : ' · brak'}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
