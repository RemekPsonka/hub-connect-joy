import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StageBadge } from './StageBadge';
import { TemperatureBadge } from './TemperatureBadge';
import { SourceBadge } from './SourceBadge';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ComplexityChips } from './ComplexityChips';
import { PremiumQuickEdit } from './PremiumQuickEdit';
import { TaskStatusPill } from './TaskStatusPill';
import { AssigneeAvatars } from './AssigneeAvatars';
import type { DealTeamContact, DealStage, OfferingStage } from '@/types/dealTeam';
import type { TaskContactInfo, TaskStatus } from '@/hooks/useActiveTaskContacts';

export type SubcategoryField = 'temperature' | 'prospect_source' | 'client_status';

interface UnifiedKanbanCardProps {
  contact: DealTeamContact;
  stage: DealStage;
  teamId: string;
  onLostClick: () => void;
  onOfferingStageChange: (next: string) => void;
  onOfferingWonClick: () => void;
  onOfferingLostClick: () => void;
  onSubcategoryChange: (field: SubcategoryField, value: string) => void;
  onMoreClick: () => void;
  onMeetingDoneClick?: () => void;
  isDragging?: boolean;
  taskInfo?: TaskContactInfo;
}

const borderClass: Record<TaskStatus, string> = {
  overdue: 'border-l-destructive',
  today: 'border-l-amber-500',
  active: 'border-l-emerald-500',
  done: 'border-l-emerald-500/40',
  none: 'border-l-muted',
};

export function UnifiedKanbanCard({
  contact,
  stage,
  teamId,
  onLostClick,
  onOfferingStageChange,
  onOfferingWonClick,
  onOfferingLostClick,
  onSubcategoryChange,
  onMoreClick,
  onMeetingDoneClick,
  isDragging,
  taskInfo,
}: UnifiedKanbanCardProps) {
  const status: TaskStatus = taskInfo?.status ?? 'none';

  const fullName = contact.contact?.full_name ?? 'Bez nazwy';
  const company = contact.contact?.company;
  const position = contact.contact?.position;

  // Suma oczekiwanych składek z 4 obszarów (stage 'client' badge)
  const potentialSumGr =
    (contact.potential_property_gr ?? 0) +
    (contact.potential_financial_gr ?? 0) +
    (contact.potential_communication_gr ?? 0) +
    (contact.potential_life_group_gr ?? 0);

  const handleCardClick = () => {
    onMoreClick();
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        'p-2.5 cursor-pointer hover:shadow-md transition-all border-l-4 min-w-0 overflow-hidden flex flex-col gap-1.5',
        borderClass[status],
        isDragging && 'opacity-50',
      )}
    >
      {/* Row 1: title + assignees */}
      <div className="flex items-start gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" title={fullName}>{fullName}</div>
          {(company || position) && (
            <div
              className="text-xs text-muted-foreground truncate"
              title={[company, position].filter(Boolean).join(' · ')}
            >
              {[company, position].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <AssigneeAvatars
            owner={contact.assigned_director ?? null}
            assignees={taskInfo?.assignees ?? []}
            onAddClick={onMoreClick}
          />
        </div>
      </div>

      {/* Row 2: tasks + sub-badge | premium (fixed zones, no wrap of premium) */}
      <div
        className="flex items-start gap-2 min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
          <TaskStatusPill info={taskInfo} onClick={onMoreClick} />
          {stage === 'lead' && (
            <TemperatureBadge
              value={contact.temperature}
              onChange={(v) => onSubcategoryChange('temperature', v)}
            />
          )}
          {stage === 'prospect' && (
            <SourceBadge
              value={contact.prospect_source}
              onChange={(v) => onSubcategoryChange('prospect_source', v)}
            />
          )}
          {stage === 'client' && (
            <ClientStatusBadge
              value={contact.client_status}
              onChange={(v) => onSubcategoryChange('client_status', v)}
            />
          )}
          {stage === 'offering' && (
            <StageBadge
              stage="offering"
              value={contact.offering_stage as OfferingStage}
              mode="compact"
              onChange={onOfferingStageChange}
              onWonClick={onOfferingWonClick}
              onLostClick={onOfferingLostClick}
            />
          )}
        </div>
        <div className="shrink-0">
          <PremiumQuickEdit
            contactId={contact.id}
            teamId={teamId}
            valueGr={contact.expected_annual_premium_gr ?? null}
          />
        </div>
      </div>

      {/* Klient stage: badge sumy oczekiwanych składek z obszarów */}
      {stage === 'client' && potentialSumGr > 0 && (
        <div
          className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5 inline-flex items-center gap-1 self-start"
          title="Suma oczekiwanych składek z obszarów (Majątek + Finansowe + Komunikacja + Życie/Grupowe)"
        >
          <span>Σ oczek.</span>
          <span className="font-semibold tabular-nums">
            {new Intl.NumberFormat('pl-PL', {
              style: 'currency',
              currency: 'PLN',
              maximumFractionDigits: 0,
            }).format(potentialSumGr / 100)}
          </span>
        </div>
      )}

      {/* Row 3: complexity chips on their own row */}
      <ComplexityChips complexity={contact.client_complexity} />

      {/* Mini-banner: always shown — overdue / next / placeholder */}
      {taskInfo?.oldestOverdue ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full min-w-0 block text-left text-[10px] px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15 transition overflow-hidden"
        >
          <span className="block truncate">
            {taskInfo.oldestOverdue.days_ago === 0
              ? `Dziś: ${taskInfo.oldestOverdue.title}`
              : `${taskInfo.oldestOverdue.days_ago} dni temu: ${taskInfo.oldestOverdue.title}`}
          </span>
        </button>
      ) : taskInfo?.nextTask ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            'w-full min-w-0 block text-left text-[10px] px-2 py-0.5 rounded-sm border transition overflow-hidden',
            taskInfo.nextTask.status === 'today'
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15',
          )}
        >
          <span className="block truncate">
            {taskInfo.nextTask.status === 'today'
              ? `Dziś: ${taskInfo.nextTask.title}`
              : taskInfo.nextTask.due_date
                ? `${taskInfo.nextTask.due_date}: ${taskInfo.nextTask.title}`
                : taskInfo.nextTask.title}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full min-w-0 block text-left text-[10px] px-2 py-0.5 rounded-sm border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-primary hover:border-primary/50 transition overflow-hidden"
        >
          <span className="block truncate">+ Zaplanuj następne zadanie</span>
        </button>
      )}

      {/* Footer: icon-only actions */}
      <div className="pt-0.5 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          title="Więcej"
          aria-label="Więcej"
          onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center gap-1">
          {onMeetingDoneClick && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-emerald-600"
              title="Spotkanie odbyte"
              aria-label="Spotkanie odbyte"
              onClick={(e) => { e.stopPropagation(); onMeetingDoneClick(); }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            title="Oznacz jako lost"
            aria-label="Oznacz jako lost"
            onClick={onLostClick}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
