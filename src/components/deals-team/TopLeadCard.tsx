import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DealTeamContact } from '@/types/dealTeam';
import type { TaskContactInfo } from '@/hooks/useActiveTaskContacts';
import { offeringStageLabel } from '@/utils/offeringStageLabels';
import { useSGUContactDisplay } from '@/hooks/useSGUContactDisplay';

interface TopLeadCardProps {
  contact: DealTeamContact;
  teamId: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  taskStatus?: TaskContactInfo;
}

export function TopLeadCard({ contact, onClick, onDragStart, onDragEnd, isDragging, taskStatus }: TopLeadCardProps) {
  const display = useSGUContactDisplay(contact);
  if (!contact.contact) return null;

  const stageLabel = offeringStageLabel(contact.offering_stage, contact.category);

  return (
    <Card
      className={cn(
        "border-l-2 border-l-amber-500 hover:bg-muted/50 transition-all cursor-pointer",
        isDragging && "opacity-50 scale-95"
      )}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="px-2 py-1.5 space-y-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {taskStatus && (
            <span title={taskStatus.status === 'overdue' ? 'Zadanie przeterminowane' : 'Ma aktywne zadanie'}>
              <CheckCircle2
                className={cn(
                  "w-3 h-3 shrink-0",
                  taskStatus.status === 'overdue' ? 'text-destructive' : 'text-green-500'
                )}
              />
            </span>
          )}
          <span className="text-xs font-medium truncate">
            {display.fullName ?? '—'}
          </span>
          {display.isSguRef && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px] shrink-0">Z CRM</Badge>
          )}
          {display.company && (
            <>
              <span className="text-muted-foreground text-xs shrink-0">·</span>
              <span className="text-xs text-muted-foreground truncate">
                {display.company}
              </span>
            </>
          )}
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0 ml-auto",
              contact.status_overdue ? 'bg-destructive' : 'bg-primary'
            )}
            title={contact.status_overdue ? 'Status nieaktualny' : 'Status aktualny'}
          />
        </div>
        {stageLabel && (
          <div className="pl-[18px]">
            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
              {stageLabel}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
