import { useMemo } from 'react';
import { AgendaItemCard } from './AgendaItemCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardCheck } from 'lucide-react';
import type { OdprawaAgendaItem } from '@/hooks/sgu/useOdprawaAgenda';

interface Props {
  items: OdprawaAgendaItem[] | undefined;
  isLoading: boolean;
  coveredIds: string[];
  onMarkCovered: (id: string) => void;
  onOpenDetails?: (id: string) => void;
}

export function OdprawaAgendaList({
  items,
  isLoading,
  coveredIds,
  onMarkCovered,
  onOpenDetails,
}: Props) {
  const coveredSet = useMemo(() => new Set(coveredIds), [coveredIds]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Brak kontaktów do omówienia"
        description="Wszystko zamknięte i obrobione — gratulacje."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AgendaItemCard
          key={item.deal_team_contact_id}
          item={item}
          isCovered={coveredSet.has(item.deal_team_contact_id)}
          onMarkCovered={onMarkCovered}
          onOpenDetails={onOpenDetails}
        />
      ))}
    </div>
  );
}