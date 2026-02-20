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
import { DraggableDealCard } from './DraggableDealCard';
import { Deal, DealStage, useMoveDeal } from '@/hooks/useDeals';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DealsKanbanProps {
  deals: Deal[];
  stages: DealStage[];
  isLoading: boolean;
}

export function DealsKanban({ deals, stages, isLoading }: DealsKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [focusedStage, setFocusedStage] = useState<DealStage | null>(null);
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

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

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

  // ─── Focus mode ─────────────
  if (focusedStage) {
    const stageDeals = dealsByStage.get(focusedStage.id) || [];
    const stageTotal = stageDeals.reduce((sum, deal) => sum + Number(deal.value), 0);

    return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFocusedStage(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Wróć do pipeline
            </button>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: focusedStage.color }}
            />
            <h2 className="font-semibold text-lg">{focusedStage.name}</h2>
            <Badge variant="secondary">{stageDeals.length}</Badge>
            <span className="text-sm text-muted-foreground">
              {stageTotal.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {stageDeals.map((deal) => (
              <DraggableDealCard key={deal.id} deal={deal} />
            ))}
            {stageDeals.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Brak deals
              </div>
            )}
          </div>
        </div>
        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} /> : null}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div
          className="flex gap-4 pb-4 min-w-max"
          onMouseLeave={() => setHoveredColumn(null)}
        >
          {stages.map((stage) => {
            const stageDeals = dealsByStage.get(stage.id) || [];
            const isHovered = hoveredColumn === stage.id;
            const isShrunk = !!hoveredColumn && hoveredColumn !== stage.id;
            return (
              <div
                key={stage.id}
                className={cn(
                  'transition-all duration-300 ease-in-out',
                  isHovered ? 'w-[450px]' : isShrunk ? 'w-[220px] opacity-70' : 'w-[300px]'
                )}
                onMouseEnter={() => setHoveredColumn(stage.id)}
              >
                <KanbanColumn
                  stage={stage}
                  deals={stageDeals}
                  onHeaderClick={() => setFocusedStage(stage)}
                />
              </div>
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
