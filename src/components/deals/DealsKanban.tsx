import { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DealCard } from './DealCard';
import { Deal, DealStage } from '@/hooks/useDeals';
import { cn } from '@/lib/utils';

interface DealsKanbanProps {
  deals: Deal[];
  stages: DealStage[];
  isLoading: boolean;
}

export function DealsKanban({ deals, stages, isLoading }: DealsKanbanProps) {
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

  const getColumnTotal = (stageId: string) => {
    const stageDeals = dealsByStage.get(stageId) || [];
    return stageDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
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
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {stages.map((stage) => {
          const stageDeals = dealsByStage.get(stage.id) || [];
          const columnTotal = getColumnTotal(stage.id);

          return (
            <div
              key={stage.id}
              className="flex flex-col w-[300px] shrink-0"
            >
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
                    {stageDeals.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {columnTotal.toLocaleString('pl-PL', {
                    style: 'currency',
                    currency: 'PLN',
                  })}
                </p>
              </div>

              {/* Column Content */}
              <div
                className={cn(
                  "flex-1 min-h-[400px] p-2 space-y-2 rounded-b-lg border border-t-0",
                  "bg-muted/30"
                )}
              >
                {stageDeals.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                    Brak deals
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
