import { useMemo } from 'react';
import { differenceInDays, max, min, isWithinInterval } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TimelineTooltip } from './TimelineTooltip';
import { POLICY_TYPE_COLORS, type InsurancePolicy, type RenewalChecklist, type PolicyType } from './types';

interface PolicyBarProps {
  policy: InsurancePolicy;
  timelineStart: Date;
  timelineEnd: Date;
  darkMode: boolean;
  isCritical: boolean;
  showCriticalPath: boolean;
  onChecklistChange: (policyId: string, key: keyof RenewalChecklist, value: boolean) => void;
  onEdit: (policy: InsurancePolicy) => void;
  onDelete: (policyId: string) => void;
}

const DANGER_ZONE_DAYS = 30;       // T-1 miesiąc (strefa zagrożenia)
const PREPARATION_DAYS = 90;       // T-3 miesiące (strefa przygotowania - pełny zielony)
const EARLY_WARNING_DAYS = 120;    // T-4 miesiące (początek narastania koloru)

export function PolicyBar({
  policy,
  timelineStart,
  timelineEnd,
  darkMode,
  isCritical,
  showCriticalPath,
  onChecklistChange,
  onEdit,
  onDelete,
}: PolicyBarProps) {
  const calculations = useMemo(() => {
    const policyStart = new Date(policy.start_date);
    const policyEnd = new Date(policy.end_date);
    const today = new Date();
    
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    
    // Clamp policy dates to timeline bounds
    const visibleStart = max([policyStart, timelineStart]);
    const visibleEnd = min([policyEnd, timelineEnd]);
    
    // Calculate positions as percentages
    const startOffset = (differenceInDays(visibleStart, timelineStart) / totalDays) * 100;
    const endOffset = (differenceInDays(visibleEnd, timelineStart) / totalDays) * 100;
    const width = endOffset - startOffset;
    
    // Early warning phase (T-4 to T-3) - 120 to 90 days before expiry
    const earlyWarningStart = new Date(policyEnd);
    earlyWarningStart.setDate(earlyWarningStart.getDate() - EARLY_WARNING_DAYS);
    const visibleEarlyWarningStart = max([earlyWarningStart, visibleStart]);
    const earlyWarningStartOffset = (differenceInDays(visibleEarlyWarningStart, timelineStart) / totalDays) * 100;
    
    // Preparation phase (T-3 to T-1) - 90 to 30 days before expiry
    const preparationStart = new Date(policyEnd);
    preparationStart.setDate(preparationStart.getDate() - PREPARATION_DAYS);
    const visiblePreparationStart = max([preparationStart, visibleStart]);
    const preparationStartOffset = (differenceInDays(visiblePreparationStart, timelineStart) / totalDays) * 100;
    
    // Danger zone (T-1) - 30 days before expiry
    const dangerZoneStart = new Date(policyEnd);
    dangerZoneStart.setDate(dangerZoneStart.getDate() - DANGER_ZONE_DAYS);
    const visibleDangerStart = max([dangerZoneStart, visibleStart]);
    const dangerStartOffset = (differenceInDays(visibleDangerStart, timelineStart) / totalDays) * 100;
    const dangerWidth = Math.max(0, endOffset - dangerStartOffset);
    
    // Early warning width (from T-4 to T-3)
    const earlyWarningEndOffset = preparationStartOffset;
    const earlyWarningWidth = Math.max(0, earlyWarningEndOffset - earlyWarningStartOffset);
    
    // Preparation width (from T-3 to T-1)
    const preparationEndOffset = dangerStartOffset;
    const preparationWidth = Math.max(0, preparationEndOffset - preparationStartOffset);
    
    const daysLeft = differenceInDays(policyEnd, today);
    const isExpired = daysLeft < 0;
    const isInDanger = daysLeft >= 0 && daysLeft <= DANGER_ZONE_DAYS;
    const isInPreparation = daysLeft > DANGER_ZONE_DAYS && daysLeft <= PREPARATION_DAYS;
    
    const isVisible = visibleStart <= visibleEnd && 
      isWithinInterval(visibleStart, { start: timelineStart, end: timelineEnd });
    
    return {
      startOffset,
      width,
      earlyWarningStartOffset: earlyWarningStartOffset - startOffset,
      earlyWarningWidth,
      preparationStartOffset: preparationStartOffset - startOffset,
      preparationWidth,
      dangerStartOffset: dangerStartOffset - startOffset,
      dangerWidth,
      isExpired,
      isInDanger,
      isInPreparation,
      isVisible,
      daysLeft,
    };
  }, [policy, timelineStart, timelineEnd]);

  if (!calculations.isVisible || calculations.width <= 0) {
    return null;
  }

  const policyColor = POLICY_TYPE_COLORS[policy.policy_type as PolicyType] || POLICY_TYPE_COLORS.other;
  const shouldHighlight = showCriticalPath && isCritical;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-md cursor-pointer transition-all ${
              shouldHighlight ? 'ring-2 ring-amber-400 ring-offset-2 shadow-lg' : 'hover:shadow-md'
            } ${calculations.isExpired ? 'opacity-60' : ''}`}
            style={{
              left: `${calculations.startOffset}%`,
              width: `${calculations.width}%`,
              minWidth: '20px',
            }}
          >
            {/* Main policy bar */}
            <div
              className="absolute inset-0 rounded-md"
              style={{
                backgroundColor: darkMode 
                  ? policyColor.replace(')', ', 0.8)').replace('hsl(', 'hsla(')
                  : policyColor,
              }}
            />
            
            {/* Early warning phase overlay (T-4 to T-3) - gradient from transparent to green */}
            {calculations.earlyWarningWidth > 0 && (
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${Math.max(0, (calculations.earlyWarningStartOffset / calculations.width) * 100)}%`,
                  width: `${Math.min(100, (calculations.earlyWarningWidth / calculations.width) * 100)}%`,
                  background: darkMode 
                    ? 'linear-gradient(to right, hsla(142, 71%, 45%, 0), hsla(142, 71%, 45%, 0.7))'
                    : 'linear-gradient(to right, hsla(142, 76%, 36%, 0), hsla(142, 76%, 36%, 0.6))',
                }}
              />
            )}
            
            {/* Preparation phase overlay (T-3 to T-1) - solid green */}
            {calculations.preparationWidth > 0 && (
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${Math.max(0, (calculations.preparationStartOffset / calculations.width) * 100)}%`,
                  width: `${Math.min(100, (calculations.preparationWidth / calculations.width) * 100)}%`,
                  backgroundColor: darkMode 
                    ? 'hsla(142, 71%, 45%, 0.7)'
                    : 'hsla(142, 76%, 36%, 0.6)',
                }}
              />
            )}
            
            {/* Danger zone overlay (T-1) - red gradient */}
            {calculations.dangerWidth > 0 && (
              <div
                className="absolute top-0 bottom-0 rounded-r-md"
                style={{
                  left: `${Math.max(0, (calculations.dangerStartOffset / calculations.width) * 100)}%`,
                  width: `${Math.min(100, (calculations.dangerWidth / calculations.width) * 100)}%`,
                  background: darkMode
                    ? 'linear-gradient(to right, hsla(0, 62%, 30%, 0.8), hsla(0, 72%, 51%, 0.9))'
                    : 'linear-gradient(to right, hsla(0, 93%, 94%, 0.9), hsla(0, 84%, 60%, 0.9))',
                }}
              />
            )}
            
            {/* Policy name label */}
            <div className="absolute inset-0 flex items-center justify-center px-2 overflow-hidden">
              <span className="text-xs font-medium text-white truncate drop-shadow-sm">
                {policy.policy_name}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="p-0 w-72"
          sideOffset={8}
        >
          <TimelineTooltip
            policy={policy}
            onChecklistChange={(key, value) => onChecklistChange(policy.id, key, value)}
            onEdit={() => onEdit(policy)}
            onDelete={() => onDelete(policy.id)}
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
