import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, X } from 'lucide-react';
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
        'p-2.5 cursor-pointer hover:shadow-md transition-all space-y-1.5 border-l-4',
        borderClass[status],
        isDragging && 'opacity-50',
      )}
    >
      {/* Row 1: title + assignees */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{fullName}</div>
          {(company || position) && (
            <div className="text-xs text-muted-foreground truncate">
              {[company, position].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <AssigneeAvatars assignees={taskInfo?.assignees ?? []} />
      </div>

      {/* Row 2: tasks + sub-badge + areas + premium */}
      <div
        className="flex items-center gap-1 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
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
        <ComplexityChips complexity={contact.client_complexity} />
        <div className="ml-auto shrink-0">
        <PremiumQuickEdit
          contactId={contact.id}
          teamId={teamId}
          valueGr={contact.expected_annual_premium_gr ?? null}
        />
      </div>
      </div>

      {/* Mini-banner: oldest overdue task */}
      {taskInfo?.oldestOverdue && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full text-left text-[10px] px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15 transition truncate"
        >
          {taskInfo.oldestOverdue.days_ago === 0
            ? `Dziś: ${taskInfo.oldestOverdue.title}`
            : `${taskInfo.oldestOverdue.days_ago} dni temu: ${taskInfo.oldestOverdue.title}`}
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
    </Card>
  );
}
