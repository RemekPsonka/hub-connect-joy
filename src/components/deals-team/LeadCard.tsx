import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PromoteDialog } from './PromoteDialog';
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

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function LeadCard({ contact, teamId, onClick, onDragStart, onDragEnd, isDragging }: LeadCardProps) {
  const [showPromote, setShowPromote] = useState(false);

  // Guard: don't render if contact data is missing (RLS filtered)
  if (!contact.contact) return null;

  return (
    <>
      <Card
        className={cn(
          "border-l-4 border-l-blue-500 hover:shadow-md transition-all cursor-pointer",
          isDragging && "opacity-50 scale-95"
        )}
        onClick={onClick}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <CardContent className="p-3 space-y-2">
          {/* Row 1: Name + priority */}
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

          {/* Row 2: Notes (truncated) */}
          {contact.notes && (
            <p className="text-xs text-muted-foreground truncate">{contact.notes}</p>
          )}

          {/* Row 3: Promote button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs justify-start text-blue-600 hover:text-blue-700"
            onClick={(e) => { e.stopPropagation(); setShowPromote(true); }}
          >
            <ArrowUp className="h-3 w-3 mr-1" />
            ↑ do TOP
          </Button>
        </CardContent>
      </Card>

      {/* Promote Dialog */}
      <PromoteDialog
        contact={contact}
        targetCategory="top"
        teamId={teamId}
        open={showPromote}
        onClose={() => setShowPromote(false)}
      />
    </>
  );
}
