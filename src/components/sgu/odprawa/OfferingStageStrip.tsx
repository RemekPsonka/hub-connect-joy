import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OFFERING_STAGE_LABEL,
  PRE_K1_SUBSTAGES,
  POST_K3_SUBSTAGES,
  type OfferingStage,
} from '@/lib/offeringStageLabels';
import type { ContactTimelineState } from '@/hooks/odprawa/useContactTimelineState';

interface Props {
  state: ContactTimelineState;
}

/**
 * Pasek sub-stage'ów wyświetlany pod osią ContactTimeline. Pokazuje przebieg
 * etapów ofertowania pomiędzy najbliższymi milestone'ami (pre-K1 lub post-K3).
 * Czysto wizualny — interakcja jest w MilestoneActionStrip.
 */
export function OfferingStageStrip({ state }: Props) {
  if (!state.showSubStageStrip) return null;

  let stages: OfferingStage[] = [];
  let endLabel = '';
  if (state.currentMilestone === 'prospect') {
    stages = PRE_K1_SUBSTAGES;
    endLabel = '→ K1';
  } else if (state.currentMilestone === 'k3') {
    stages = POST_K3_SUBSTAGES;
    endLabel = '→ K4';
  } else {
    return null;
  }

  const currentIdx = state.currentOfferingStage
    ? stages.indexOf(state.currentOfferingStage)
    : -1;

  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground border-t border-border/40 pt-3">
      {stages.map((stage, idx) => {
        const isCurrent = idx === currentIdx;
        const isPast = currentIdx >= 0 && idx < currentIdx;
        return (
          <div key={stage} className="flex items-center gap-2">
            <span
              className={cn(
                'flex items-center justify-center h-4 w-4 rounded-full border',
                isCurrent && 'bg-primary border-primary text-primary-foreground',
                isPast && 'bg-muted border-muted-foreground/40 text-muted-foreground',
                !isCurrent && !isPast && 'bg-background border-muted-foreground/30',
              )}
            >
              {isPast && <Check className="h-2.5 w-2.5" />}
            </span>
            <span
              className={cn(
                'whitespace-nowrap',
                isCurrent && 'text-foreground font-medium',
              )}
            >
              {OFFERING_STAGE_LABEL[stage]}
            </span>
            <span className="text-muted-foreground/60">→</span>
          </div>
        );
      })}
      <span className="whitespace-nowrap font-medium text-foreground/70">
        {endLabel}
      </span>
    </div>
  );
}
