import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StageBadge } from './StageBadge';
import { TemperatureBadge } from './TemperatureBadge';
import { SourceBadge } from './SourceBadge';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ComplexityChips } from './ComplexityChips';
import { PremiumQuickEdit } from './PremiumQuickEdit';
import type { DealTeamContact, DealStage, OfferingStage } from '@/types/dealTeam';

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
  isDragging?: boolean;
}

export function UnifiedKanbanCard({
  contact,
  stage,
  teamId,
  onLostClick,
  onOfferingStageChange,
  onOfferingWonClick,
  onOfferingLostClick,
  onSubcategoryChange,
  isDragging,
}: UnifiedKanbanCardProps) {
  const navigate = useNavigate();

  const isOverdue =
    contact.status_overdue ||
    (!!contact.next_action_date && new Date(contact.next_action_date) < new Date());

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
        'p-3 cursor-pointer hover:shadow-md transition-all space-y-2',
        isOverdue && 'ring-2 ring-destructive',
        isDragging && 'opacity-50',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{fullName}</div>
          {(company || position) && (
            <div className="text-xs text-muted-foreground truncate">
              {[company, position].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
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

      {/* Lost button */}
      <div className="pt-1 border-t flex justify-end" onClick={(e) => e.stopPropagation()}>
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
