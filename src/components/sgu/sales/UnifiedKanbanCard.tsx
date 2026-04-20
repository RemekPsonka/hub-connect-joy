import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StageBadge } from './StageBadge';
import type { DealTeamContact, DealStage, OfferingStage, Temperature } from '@/types/dealTeam';

interface UnifiedKanbanCardProps {
  contact: DealTeamContact;
  stage: DealStage;
  onLostClick: () => void;
  onOfferingStageChange: (next: string) => void;
  onOfferingWonClick: () => void;
  onOfferingLostClick: () => void;
  isDragging?: boolean;
}

const TEMP_CLASSES: Record<Temperature, string> = {
  hot: 'bg-red-500/15 text-red-700 border-red-300',
  top: 'bg-violet-500/15 text-violet-700 border-violet-300',
  cold: 'bg-slate-500/15 text-slate-700 border-slate-300',
  '10x': 'bg-amber-500/15 text-amber-700 border-amber-300',
};

const TEMP_LABELS: Record<Temperature, string> = {
  hot: 'HOT',
  top: 'TOP',
  cold: 'COLD',
  '10x': '10X',
};

const AREAS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'property_active', label: 'Majątek', icon: '🏠' },
  { key: 'financial_active', label: 'Finansowe', icon: '💰' },
  { key: 'communication_active', label: 'Komunikacja', icon: '📞' },
  { key: 'life_group_active', label: 'Grupowe/Życie', icon: '🏥' },
];

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

  const temp = (contact.temperature ?? (['hot', 'top', 'cold', '10x'].includes(contact.category) ? (contact.category as Temperature) : null)) as Temperature | null;
  const isAmbassador = contact.client_status === 'ambassador';

  const complexity = (contact.client_complexity ?? {}) as Record<string, unknown>;
  const activeAreas = AREAS.filter((a) => !!complexity[a.key]);

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
          {temp && (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', TEMP_CLASSES[temp])}>
              {TEMP_LABELS[temp]}
            </Badge>
          )}
          {isAmbassador && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-700 border-amber-300 gap-0.5">
              <Star className="h-3 w-3 fill-current" />
              Ambasador
            </Badge>
          )}
          {isOverdue && (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          )}
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
      {activeAreas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {activeAreas.map((a) => (
            <span
              key={a.key}
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </span>
          ))}
        </div>
      )}

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
