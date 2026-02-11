import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PromoteDialog } from './PromoteDialog';
import { cn } from '@/lib/utils';
import type { DealTeamContact } from '@/types/dealTeam';

interface ColdLeadCardProps {
  contact: DealTeamContact;
  teamId: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function ColdLeadCard({ contact, teamId, onClick, onDragStart, onDragEnd, isDragging }: ColdLeadCardProps) {
  const [showPromote, setShowPromote] = useState(false);

  if (!contact.contact) return null;

  return (
    <>
      <Card
        className={cn(
          "border-l-4 border-l-slate-400 hover:shadow-md transition-all cursor-pointer",
          isDragging && "opacity-50 scale-95"
        )}
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <span className="font-medium text-sm block truncate">
                {contact.contact?.full_name || 'Nieznany kontakt'}
              </span>
              {contact.contact?.company && (
                <p className="text-xs text-muted-foreground truncate">
                  {contact.contact.company}
                </p>
              )}
            </div>
            <Badge className={`text-xs shrink-0 ${priorityColors[contact.priority]}`}>
              {contact.priority}
            </Badge>
          </div>

          {contact.notes && (
            <p className="text-xs text-muted-foreground truncate">{contact.notes}</p>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs justify-start text-slate-600 hover:text-slate-700"
            onClick={(e) => { e.stopPropagation(); setShowPromote(true); }}
          >
            <ArrowUp className="h-3 w-3 mr-1" />
            ↑ do LEAD
          </Button>
        </CardContent>
      </Card>

      <PromoteDialog
        contact={contact}
        targetCategory="lead"
        teamId={teamId}
        open={showPromote}
        onClose={() => setShowPromote(false)}
      />
    </>
  );
}
