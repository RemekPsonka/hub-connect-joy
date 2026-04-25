import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ContactTimelineState } from '@/hooks/odprawa/useContactTimelineState';

interface ContactTimelineProps {
  state: ContactTimelineState;
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'dd.MM.yyyy', { locale: pl });
  } catch {
    return '—';
  }
}

const TEMP_LABELS: Record<string, { label: string; cls: string }> = {
  hot: { label: '🔥 hot', cls: 'bg-red-500/15 text-red-700 border-red-500/30' },
  top: { label: '⭐ top', cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  cold: { label: '❄️ cold', cls: 'bg-sky-500/15 text-sky-700 border-sky-500/30' },
  '10x': { label: '🔄 10x', cls: 'bg-violet-500/15 text-violet-700 border-violet-500/30' },
};

const FILL_COLOR: Record<ContactTimelineState['stalledColor'], string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const DOT_ACHIEVED: Record<ContactTimelineState['stalledColor'], string> = {
  green: 'bg-emerald-500 border-emerald-500',
  amber: 'bg-amber-500 border-amber-500',
  red: 'bg-red-500 border-red-500',
};

export function ContactTimeline({ state }: ContactTimelineProps) {
  const total = state.milestones.length;
  const lastAchievedIdx = state.milestones.reduce(
    (acc, m, idx) => (m.achieved ? idx : acc),
    0,
  );
  const fillPct = total > 1 ? (lastAchievedIdx / (total - 1)) * 100 : 0;
  const currentIdx = state.milestones.findIndex((m) => m.key === state.currentMilestone);

  return (
    <div className="space-y-4">
      {/* Tagi */}
      <div className="flex flex-wrap items-center gap-2">
        {state.stalledColor === 'red' && (
          <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-500/30">
            Stalled {state.stalledDays} dni
          </Badge>
        )}
        {state.stalledColor === 'amber' && (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">
            Czeka {state.stalledDays} dni
          </Badge>
        )}
        {state.temperature && TEMP_LABELS[state.temperature] && (
          <Badge variant="outline" className={TEMP_LABELS[state.temperature].cls}>
            {TEMP_LABELS[state.temperature].label}
          </Badge>
        )}
      </div>

      {/* Oś */}
      <div className="relative pt-2 pb-1">
        {/* Tor */}
        <div className="absolute left-0 right-0 top-[18px] h-1 rounded-full bg-muted" />
        {/* Wypełnienie */}
        <div
          className={cn('absolute left-0 top-[18px] h-1 rounded-full transition-all', FILL_COLOR[state.stalledColor])}
          style={{ width: `${fillPct}%` }}
        />

        <div className="relative flex justify-between">
          {state.milestones.map((m, idx) => {
            const isCurrent = idx === currentIdx;
            return (
              <div key={m.key} className="flex flex-col items-center w-[16%] min-w-0">
                <div className="relative flex items-center justify-center h-9">
                  {isCurrent && (
                    <span
                      className={cn(
                        'absolute inset-0 m-auto h-7 w-7 rounded-full opacity-30 animate-ping',
                        FILL_COLOR[state.stalledColor],
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'relative h-4 w-4 rounded-full border-2',
                      m.achieved
                        ? DOT_ACHIEVED[state.stalledColor]
                        : 'bg-background border-muted-foreground/40',
                      isCurrent && 'h-5 w-5 ring-2 ring-offset-2 ring-offset-background',
                      isCurrent && state.stalledColor === 'red' && 'ring-red-500/40',
                      isCurrent && state.stalledColor === 'amber' && 'ring-amber-500/40',
                      isCurrent && state.stalledColor === 'green' && 'ring-emerald-500/40',
                    )}
                  />
                </div>
                <div className="mt-1 text-xs font-medium text-center truncate w-full">{m.label}</div>
                <div className="text-[10px] text-muted-foreground">{fmt(m.date)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overlays */}
      {state.isWon && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
          ✓ Klient od {fmt(state.wonAt)}
        </div>
      )}
      {state.isLost && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-800">
          ✗ Utracony{state.lostReason ? `: ${state.lostReason}` : ''}
        </div>
      )}
      {state.isParked && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          ⏸ Odłożone do {fmt(state.parkedUntil)}
        </div>
      )}
    </div>
  );
}
