import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Deal } from '@/hooks/useDeals';
import { DealCard } from './DealCard';

interface DraggableDealCardProps {
  deal: Deal;
}

export function DraggableDealCard({ deal }: DraggableDealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <DealCard deal={deal} />
    </div>
  );
}
