import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StageBadge } from './StageBadge';
import { TemperatureBadge } from './TemperatureBadge';
import { SourceBadge } from './SourceBadge';
import { ComplexityChips } from './ComplexityChips';
import type { DealTeamContact, DealStage, OfferingStage } from '@/types/dealTeam';

interface UnifiedKanbanCardProps {
  contact: DealTeamContact;
  stage: DealStage;
  onLostClick: () => void;
  onOfferingStageChange: (next: string) => void;
  onOfferingWonClick: () => void;
  onOfferingLostClick: () => void;
  isDragging?: boolean;
}

export function UnifiedKanbanCard({
  contact,
  stage,
  onLostClick,
  onOfferingStageChange,
  onOfferingWonClick,
  onOfferingLostClick,
  isDragging,
}: UnifiedKanbanCardProps) {
  const navigate = useNavigate();

  const isOverdue =
    contact.status_overdue ||
    (!!contact.next_action_date && new Date(contact.next_action_date) < new Date());

  const isAmbassador = contact.client_status === 'ambassador';

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
        <div className="flex items-center gap-1 shrink-0">
          {stage === 'lead' && <TemperatureBadge value={contact.temperature} />}
          {stage === 'prospect' && <SourceBadge value={contact.prospect_source} />}
          {stage === 'client' && isAmbassador && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-700 border-amber-300 gap-0.5"
            >
              <Star className="h-3 w-3 fill-current" />
              Ambasador
            </Badge>
          )}
          {isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        </div>
      </div>

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
