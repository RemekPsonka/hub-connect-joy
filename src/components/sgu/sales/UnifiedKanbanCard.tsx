import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  isDragging,
  taskInfo,
}: UnifiedKanbanCardProps) {
  const navigate = useNavigate();

  const status: TaskStatus = taskInfo?.status ?? 'none';

  const fullName = contact.contact?.full_name ?? 'Bez nazwy';
  const company = contact.contact?.company;
  const position = contact.contact?.position;

  const handleCardClick = () => {
    navigate(`/sgu/klienci?contactId=${contact.contact_id}`);
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-all space-y-2 border-l-4',
        borderClass[status],
        isDragging && 'opacity-50',
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{fullName}</div>
          {(company || position) && (
            <div className="text-xs text-muted-foreground truncate">
              {[company, position].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <TaskStatusPill info={taskInfo} onClick={onMoreClick} />
          <div className="ml-auto">
            <AssigneeAvatars assignees={taskInfo?.assignees ?? []} />
          </div>
        </div>
      </div>

      {/* Sub-category badge — only for the matching stage */}
      {(stage === 'lead' || stage === 'prospect' || stage === 'client') && (
        <div
          className="flex items-center gap-1 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
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
        </div>
      )}

      {/* Offering stage badge */}
      {stage === 'offering' && (
        <div onClick={(e) => e.stopPropagation()}>
          <StageBadge
            stage="offering"
            value={contact.offering_stage as OfferingStage}
            mode="compact"
            onChange={onOfferingStageChange}
            onWonClick={onOfferingWonClick}
            onLostClick={onOfferingLostClick}
          />
        </div>
      )}

      {/* Areas */}
      <ComplexityChips complexity={contact.client_complexity} />

      {/* Premium quick edit */}
      <div onClick={(e) => e.stopPropagation()}>
        <PremiumQuickEdit
          contactId={contact.id}
          teamId={teamId}
          valueGr={contact.expected_annual_premium_gr ?? null}
        />
      </div>

      {/* Mini-banner: oldest overdue task */}
      {taskInfo?.oldestOverdue && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full text-left text-[11px] px-2 py-1 rounded bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15 transition truncate"
        >
          {taskInfo.oldestOverdue.days_ago === 0
            ? `Dziś: ${taskInfo.oldestOverdue.title}`
            : `${taskInfo.oldestOverdue.days_ago} dni temu: ${taskInfo.oldestOverdue.title}`}
        </button>
      )}

      {/* Footer: More + Lost */}
      <div className="pt-1 border-t flex justify-end items-center" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px] gap-1 mr-auto"
          onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3 w-3" />
          Więcej
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
          onClick={onLostClick}
        >
          Oznacz jako lost
        </Button>
      </div>
    </Card>
  );
}
