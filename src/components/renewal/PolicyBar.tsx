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

const DANGER_ZONE_DAYS = 30;
const ACTION_PHASE_DAYS = 90;

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
    
    // Action phase (90 days before expiry)
    const actionPhaseStart = new Date(policyEnd);
    actionPhaseStart.setDate(actionPhaseStart.getDate() - ACTION_PHASE_DAYS);
    const visibleActionStart = max([actionPhaseStart, visibleStart]);
    const actionStartOffset = (differenceInDays(visibleActionStart, timelineStart) / totalDays) * 100;
    const actionWidth = Math.max(0, endOffset - actionStartOffset);
    
    // Danger zone (30 days before expiry)
    const dangerZoneStart = new Date(policyEnd);
    dangerZoneStart.setDate(dangerZoneStart.getDate() - DANGER_ZONE_DAYS);
    const visibleDangerStart = max([dangerZoneStart, visibleStart]);
    const dangerStartOffset = (differenceInDays(visibleDangerStart, timelineStart) / totalDays) * 100;
    const dangerWidth = Math.max(0, endOffset - dangerStartOffset);
    
    const daysLeft = differenceInDays(policyEnd, today);
    const isExpired = daysLeft < 0;
    const isInDanger = daysLeft >= 0 && daysLeft <= DANGER_ZONE_DAYS;
    const isInAction = daysLeft > DANGER_ZONE_DAYS && daysLeft <= ACTION_PHASE_DAYS;
    
    const isVisible = visibleStart <= visibleEnd && 
      isWithinInterval(visibleStart, { start: timelineStart, end: timelineEnd });
    
    return {
      startOffset,
      width,
      actionStartOffset: actionStartOffset - startOffset,
      actionWidth,
      dangerStartOffset: dangerStartOffset - startOffset,
      dangerWidth,
      isExpired,
      isInDanger,
      isInAction,
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
            
            {/* Action phase overlay (green) */}
            {calculations.actionWidth > 0 && (
              <div
                className="absolute top-0 bottom-0 rounded-r-md"
                style={{
                  left: `${Math.max(0, (calculations.actionStartOffset / calculations.width) * 100)}%`,
                  width: `${Math.min(100, (calculations.actionWidth / calculations.width) * 100)}%`,
                  backgroundColor: darkMode 
                    ? 'hsla(142, 71%, 45%, 0.7)'
                    : 'hsla(142, 76%, 36%, 0.6)',
                }}
              />
            )}
            
            {/* Danger zone overlay (red gradient) */}
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
