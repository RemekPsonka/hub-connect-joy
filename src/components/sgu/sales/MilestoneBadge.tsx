import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface MilestoneValues {
  k1?: string | null;
  k2a?: string | null;
  k2b?: string | null;
  k3?: string | null;
  k4?: string | null;
}

interface MilestoneBadgeProps {
  milestones: MilestoneValues;
}

const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function fmt(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFmt.format(d);
}

const baseClass =
  'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none border transition-colors';
const onClass = 'bg-emerald-600 text-white border-emerald-600';
const halfClass = 'bg-emerald-400/60 text-emerald-950 border-emerald-400/60';
const offClass = 'bg-muted text-muted-foreground border-border';

export function MilestoneBadge({ milestones }: MilestoneBadgeProps) {
  const { k1, k2a, k2b, k3, k4 } = milestones;

  // Hide entirely if nothing has been reached yet
  if (!k1 && !k2a && !k2b && !k3 && !k4) return null;

  const k2Class = k2a && k2b ? onClass : k2a ? halfClass : offClass;
  const k2Tooltip = `K2 Handshake: ${fmt(k2a)} · K2+ Pełnomocnictwo: ${fmt(k2b)}`;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1" aria-label="Kamienie milowe K1-K4">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(baseClass, k1 ? onClass : offClass)}>K1</span>
          </TooltipTrigger>
          <TooltipContent>K1 Spotkanie: {fmt(k1)}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(baseClass, k2Class)}>K2</span>
          </TooltipTrigger>
          <TooltipContent>{k2Tooltip}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(baseClass, k3 ? onClass : offClass)}>K3</span>
          </TooltipTrigger>
          <TooltipContent>K3 Audyt: {fmt(k3)}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(baseClass, k4 ? onClass : offClass)}>K4</span>
          </TooltipTrigger>
          <TooltipContent>K4 Polisa wygrana: {fmt(k4)}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}