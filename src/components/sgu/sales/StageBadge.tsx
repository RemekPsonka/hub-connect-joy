import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  TEMPERATURE_LABELS,
  PROSPECT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  OFFERING_STAGE_LABELS,
  OFFERING_STAGE_ORDER,
  type DealStage,
  type Temperature,
  type ProspectSource,
  type ClientStatus,
  type OfferingStage,
} from '@/types/dealTeam';

type SubValue = Temperature | ProspectSource | ClientStatus | OfferingStage | null | undefined;

interface StageBadgeProps {
  stage: DealStage;
  value: SubValue;
  mode?: 'compact' | 'full';
  onChange: (next: string) => void;
  onWonClick?: () => void;
  onLostClick?: () => void;
}

function optionsFor(stage: DealStage): { key: string; label: string }[] {
  switch (stage) {
    case 'lead':
      return Object.entries(TEMPERATURE_LABELS).map(([key, label]) => ({ key, label }));
    case 'prospect':
      return Object.entries(PROSPECT_SOURCE_LABELS).map(([key, label]) => ({ key, label }));
    case 'client':
      return Object.entries(CLIENT_STATUS_LABELS).map(([key, label]) => ({ key, label }));
    case 'offering':
      return OFFERING_STAGE_ORDER.map((k) => ({ key: k, label: OFFERING_STAGE_LABELS[k] ?? k }));
    default:
      return [];
  }
}

function labelFor(stage: DealStage, value: SubValue): string {
  if (!value) return '—';
  const v = String(value);
  if (stage === 'lead') return TEMPERATURE_LABELS[v as Temperature] ?? v;
  if (stage === 'prospect') return PROSPECT_SOURCE_LABELS[v as ProspectSource] ?? v;
  if (stage === 'client') return CLIENT_STATUS_LABELS[v as ClientStatus] ?? v;
  if (stage === 'offering') return OFFERING_STAGE_LABELS[v as OfferingStage] ?? v;
  return v;
}

function variantFor(stage: DealStage, value: SubValue): string {
  const v = String(value ?? '');
  if (stage === 'lead') {
    if (v === 'hot') return 'bg-red-500/15 text-red-700 border-red-300';
    if (v === 'top') return 'bg-amber-500/15 text-amber-700 border-amber-300';
    if (v === 'cold') return 'bg-sky-500/15 text-sky-700 border-sky-300';
    if (v === '10x') return 'bg-violet-500/15 text-violet-700 border-violet-300';
  }
  if (stage === 'client') {
    if (v === 'ambassador') return 'bg-emerald-500/15 text-emerald-700 border-emerald-300';
    if (v === 'lost') return 'bg-muted text-muted-foreground';
  }
  if (stage === 'offering') {
    if (v === 'won') return 'bg-emerald-500/15 text-emerald-700 border-emerald-300';
    if (v === 'lost') return 'bg-destructive/15 text-destructive border-destructive/30';
  }
  return 'bg-secondary text-secondary-foreground';
}

export function StageBadge({ stage, value, mode = 'compact', onChange, onWonClick, onLostClick }: StageBadgeProps) {
  const opts = optionsFor(stage);
  const label = labelFor(stage, value);
  const cls = variantFor(stage, value);

  function handlePick(key: string) {
    if (stage === 'offering' && key === 'won' && onWonClick) {
      onWonClick();
      return;
    }
    if (stage === 'offering' && key === 'lost' && onLostClick) {
      onLostClick();
      return;
    }
    onChange(key);
  }

  if (opts.length === 0) {
    return (
      <Badge variant="outline" className={cn('text-[10px]', cls)}>
        {label}
      </Badge>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium hover:opacity-80',
            cls,
            mode === 'full' && 'text-xs px-2.5 py-1',
          )}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-48 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] uppercase text-muted-foreground px-2 py-1">
          {stage === 'lead' && 'Temperatura'}
          {stage === 'prospect' && 'Źródło'}
          {stage === 'client' && 'Status klienta'}
          {stage === 'offering' && 'Etap ofertowania'}
        </div>
        {opts.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => handlePick(o.key)}
            className={cn(
              'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent',
              String(value) === o.key && 'bg-accent font-semibold',
            )}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
