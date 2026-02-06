import { useDroppable } from '@dnd-kit/core';
import { DealStage, Deal } from '@/hooks/useDeals';
import { DraggableDealCard } from './DraggableDealCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  stage: DealStage;
  deals: Deal[];
}

export function KanbanColumn({ stage, deals }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
  });

  const columnTotal = deals.reduce((sum, deal) => sum + Number(deal.value), 0);

  return (
    <div className="flex flex-col w-[300px] shrink-0">
      {/* Column Header */}
      <div
        className="rounded-t-lg p-3 border-b-2"
        style={{
          backgroundColor: `${stage.color}15`,
          borderBottomColor: stage.color,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="font-medium text-sm">{stage.name}</span>
          </div>
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {columnTotal.toLocaleString('pl-PL', {
            style: 'currency',
            currency: 'PLN',
          })}
        </p>
      </div>

      {/* Column Content - Droppable Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[400px] p-2 space-y-2 rounded-b-lg border border-t-0 transition-colors",
          "bg-muted/30",
          isOver && "bg-primary/10 border-primary/50"
        )}
      >
        {deals.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            Brak deals
          </div>
        ) : (
          deals.map((deal) => (
            <DraggableDealCard key={deal.id} deal={deal} />
          ))
        )}
      </div>
    </div>
  );
}
