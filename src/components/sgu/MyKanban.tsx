import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * MyKanban — okrojony 4-kolumnowy kanban dla SGU repów.
 * Mapping `deal_team_contacts.category` → kolumny:
 *   Lead     ← NULL, '', 'cold'  (kontakty świeże + zimne traktujemy jako pula leadów)
 *   Hot      ← 'hot'
 *   10x      ← '10x'
 *   Stracony ← 'lost'
 * Drag-end aktualizuje pole `category` w deal_team_contacts (optymistycznie).
 */

type KanbanColumn = 'lead' | 'hot' | '10x' | 'lost';

const COLUMNS: Array<{ key: KanbanColumn; label: string; tone: string }> = [
  { key: 'lead', label: 'Lead', tone: 'bg-slate-50 dark:bg-slate-900/40' },
  { key: 'hot', label: 'Hot', tone: 'bg-orange-50 dark:bg-orange-950/30' },
  { key: '10x', label: '10x', tone: 'bg-violet-50 dark:bg-violet-950/30' },
  { key: 'lost', label: 'Stracony', tone: 'bg-red-50 dark:bg-red-950/30' },
];

interface SGUKanbanCard {
  id: string;
  category: string | null;
  contact_id: string | null;
  notes: string | null;
}

const toColumn = (category: string | null): KanbanColumn => {
  if (category === 'hot') return 'hot';
  if (category === '10x') return '10x';
  if (category === 'lost') return 'lost';
  return 'lead';
};

function DraggableCard({ card }: { card: SGUKanbanCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'p-3 rounded-md border bg-card text-sm cursor-grab active:cursor-grabbing shadow-sm',
        isDragging && 'opacity-40',
      )}
    >
      <p className="font-medium truncate">Kontakt {card.contact_id?.slice(0, 8) ?? card.id.slice(0, 8)}</p>
      {card.notes && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{card.notes}</p>}
    </div>
  );
}

function DroppableColumn({
  col,
  cards,
}: {
  col: (typeof COLUMNS)[number];
  cards: SGUKanbanCard[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border p-3 min-h-[300px] transition-colors',
        col.tone,
        isOver && 'ring-2 ring-primary',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{col.label}</h3>
        <Badge variant="secondary">{cards.length}</Badge>
      </div>
      <div className="space-y-2 flex-1">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} />
        ))}
        {cards.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Brak kontaktów</p>
        )}
      </div>
    </div>
  );
}

export function MyKanban() {
  const { sguTeamId } = useSGUTeamId();
  const qc = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['sgu-kanban', sguTeamId],
    enabled: !!sguTeamId,
    queryFn: async (): Promise<SGUKanbanCard[]> => {
      const { data, error } = await supabase
        .from('deal_team_contacts')
        .select('id, category, contact_id, notes')
        .eq('team_id', sguTeamId!)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as SGUKanbanCard[];
    },
  });

  const moveCard = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: KanbanColumn }) => {
      // Lead bucket → set NULL (preserves "fresh" semantics)
      const dbValue = category === 'lead' ? null : category;
      const { error } = await supabase
        .from('deal_team_contacts')
        .update({ category: dbValue as never })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, category }) => {
      await qc.cancelQueries({ queryKey: ['sgu-kanban', sguTeamId] });
      const prev = qc.getQueryData<SGUKanbanCard[]>(['sgu-kanban', sguTeamId]);
      qc.setQueryData<SGUKanbanCard[]>(['sgu-kanban', sguTeamId], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, category: category === 'lead' ? null : category } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['sgu-kanban', sguTeamId], ctx.prev);
      toast.error('Nie udało się zmienić kategorii');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sgu-kanban', sguTeamId] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns = useMemo(() => {
    const grouped: Record<KanbanColumn, SGUKanbanCard[]> = { lead: [], hot: [], '10x': [], lost: [] };
    for (const c of cards) grouped[toColumn(c.category)].push(c);
    return grouped;
  }, [cards]);

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const id = String(e.active.id);
    const target = e.over.id as KanbanColumn;
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    if (toColumn(card.category) === target) return;
    moveCard.mutate({ id, category: target });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {COLUMNS.map((c) => (
          <Skeleton key={c.key} className="h-[300px]" />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {COLUMNS.map((col) => (
          <DroppableColumn key={col.key} col={col} cards={columns[col.key]} />
        ))}
      </div>
    </DndContext>
  );
}
