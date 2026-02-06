import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanbanColumn } from './KanbanColumn';
import { DealCard } from './DealCard';
import { Deal, DealStage, useMoveDeal } from '@/hooks/useDeals';

interface DealsKanbanProps {
  deals: Deal[];
  stages: DealStage[];
  isLoading: boolean;
}

export function DealsKanban({ deals, stages, isLoading }: DealsKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const moveDeal = useMoveDeal();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    stages.forEach((stage) => {
      map.set(stage.id, []);
    });
    deals.forEach((deal) => {
      const stageDeal = map.get(deal.stage_id);
      if (stageDeal) {
        stageDeal.push(deal);
      }
    });
    return map;
  }, [deals, stages]);

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDeal((prev) => {
      if (prev && prev.id === active.id) {
        return null;
      }
      return prev;
    });

    if (!over) return;

    const dealId = active.id as string;
    const newStageId = over.id as string;

    // Find the deal and check if stage actually changed
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    // Verify the target is a valid stage
    const newStage = stages.find((s) => s.id === newStageId);
    if (!newStage) return;

    moveDeal.mutate({ dealId, stageId: newStageId });
  };

  if (stages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">Brak etapów pipeline</h3>
        <p className="text-muted-foreground">Skonfiguruj etapy, aby używać widoku Kanban.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {stages.map((stage) => {
            const stageDeals = dealsByStage.get(stage.id) || [];
            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={stageDeals}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
