import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DealTeamContact } from '@/types/dealTeam';

interface LeadCardProps {
  contact: DealTeamContact;
  teamId: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export function LeadCard({ contact, onClick, onDragStart, onDragEnd, isDragging }: LeadCardProps) {
  if (!contact.contact) return null;

  return (
    <Card
      className={cn(
        "border-l-2 border-l-blue-500 hover:bg-muted/50 transition-all cursor-pointer",
        isDragging && "opacity-50 scale-95"
      )}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="px-2 py-1.5 flex items-center gap-1.5 min-w-0">
        <span className="text-xs font-medium truncate">
          {contact.contact.full_name}
        </span>
        {contact.contact.company && (
          <>
            <span className="text-muted-foreground text-xs shrink-0">·</span>
            <span className="text-xs text-muted-foreground truncate">
              {contact.contact.company}
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
    </Card>
  );
}
