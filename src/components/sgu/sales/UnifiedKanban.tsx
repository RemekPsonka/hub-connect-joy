import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTeamContacts, useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { UnifiedKanbanCard } from './UnifiedKanbanCard';
import { ConvertWonToClientDialog } from './ConvertWonToClientDialog';
import { LostReasonDialog } from './LostReasonDialog';
import type { DealTeamContact, DealStage } from '@/types/dealTeam';

interface UnifiedKanbanProps {
  teamId: string;
  filter?: 'prospect' | 'lead' | 'offering' | null;
}

interface ColumnDef {
  stage: DealStage;
  title: string;
  icon: string;
  borderClass: string;
}

const COLUMNS: ColumnDef[] = [
  { stage: 'prospect', title: 'Prospekt', icon: '🔍', borderClass: 'border-t-slate-400' },
  { stage: 'lead', title: 'Lead', icon: '🔥', borderClass: 'border-t-amber-500' },
  { stage: 'offering', title: 'Ofertowanie', icon: '💼', borderClass: 'border-t-blue-500' },
  { stage: 'client', title: 'Klient', icon: '⭐', borderClass: 'border-t-emerald-500' },
];

function deriveStage(c: DealTeamContact): DealStage {
  if (c.deal_stage) return c.deal_stage;
  const cat = c.category;
  if (cat === 'client') return 'client';
  if (cat === 'offering' || cat === 'audit') return 'offering';
  if (['lead', 'hot', 'top', 'cold', '10x'].includes(cat)) return 'lead';
  if (cat === 'lost') return 'lost';
  return 'prospect';
}

function DraggableCard({
  contact,
  stage,
  onLostClick,
  onOfferingStageChange,
  onOfferingWonClick,
  onOfferingLostClick,
}: {
  contact: DealTeamContact;
  stage: DealStage;
  onLostClick: () => void;
  onOfferingStageChange: (next: string) => void;
  onOfferingWonClick: () => void;
  onOfferingLostClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: contact.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <UnifiedKanbanCard
        contact={contact}
        stage={stage}
        onLostClick={onLostClick}
        onOfferingStageChange={onOfferingStageChange}
        onOfferingWonClick={onOfferingWonClick}
        onOfferingLostClick={onOfferingLostClick}
        isDragging={isDragging}
      />
    </div>
  );
}

function DroppableColumn({
  col,
  contacts,
  onLostClick,
  onOfferingStageChange,
  onOfferingWonClick,
  onOfferingLostClick,
}: {
  col: ColumnDef;
  contacts: DealTeamContact[];
  onLostClick: (c: DealTeamContact) => void;
  onOfferingStageChange: (c: DealTeamContact, next: string) => void;
  onOfferingWonClick: (c: DealTeamContact) => void;
  onOfferingLostClick: (c: DealTeamContact) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-muted/30 rounded-lg border border-t-2 flex flex-col min-h-[400px] max-h-[calc(100vh-320px)] transition-colors',
        col.borderClass,
        isOver && 'ring-2 ring-primary/50 bg-primary/5',
      )}
    >
      <div className="p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{col.icon}</span>
          <h3 className="font-semibold text-sm">{col.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        {contacts.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-center p-4">
            <p className="text-sm text-muted-foreground">Brak kontaktów</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => (
              <DraggableCard
                key={c.id}
                contact={c}
                stage={col.stage}
                onLostClick={() => onLostClick(c)}
                onOfferingStageChange={(next) => onOfferingStageChange(c, next)}
                onOfferingWonClick={() => onOfferingWonClick(c)}
                onOfferingLostClick={() => onOfferingLostClick(c)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function UnifiedKanban({ teamId, filter }: UnifiedKanbanProps) {
  const { data: contacts = [], isLoading } = useTeamContacts(teamId);
  const updateContact = useUpdateTeamContact();

  const [convertContact, setConvertContact] = useState<DealTeamContact | null>(null);
  const [lostContact, setLostContact] = useState<DealTeamContact | null>(null);
  const [lostFromOffering, setLostFromOffering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visible = useMemo(() => {
    const nowIso = new Date().toISOString();
    return contacts.filter(
      (c) =>
        !c.is_lost &&
        (!c.snoozed_until || c.snoozed_until < nowIso),
    );
  }, [contacts]);

  const grouped = useMemo(() => {
    const map: Record<DealStage, DealTeamContact[]> = {
      prospect: [],
      lead: [],
      offering: [],
      client: [],
      lost: [],
    };
    for (const c of visible) {
      const s = deriveStage(c);
      if (map[s]) map[s].push(c);
    }
    return map;
  }, [visible]);

  const visibleColumns = useMemo(
    () => (filter ? COLUMNS.filter((c) => c.stage === filter) : COLUMNS),
    [filter],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const contact = visible.find((c) => c.id === active.id);
    if (!contact) return;

    const fromStage = deriveStage(contact);
    const toStage = over.id as DealStage;
    if (fromStage === toStage) return;

    // Allowed transitions
    if (fromStage === 'prospect' && toStage === 'lead') {
      updateContact.mutate({ id: contact.id, teamId, category: 'lead' });
      return;
    }
    if (fromStage === 'lead' && toStage === 'offering') {
      updateContact.mutate({
        id: contact.id,
        teamId,
        category: 'offering',
        offeringStage: 'decision_meeting',
      });
      return;
    }
    if (fromStage === 'offering' && toStage === 'client') {
      setConvertContact(contact);
      return;
    }

    toast.info('Przejście niedostępne — użyj akcji na karcie');
  }

  function handleOfferingStageChange(c: DealTeamContact, next: string) {
    updateContact.mutate({
      id: c.id,
      teamId,
      offeringStage: next as DealTeamContact['offering_stage'],
    });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Ładowanie kontaktów…</div>;
  }

  const gridCols =
    visibleColumns.length === 1
      ? 'grid-cols-1'
      : visibleColumns.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : visibleColumns.length === 3
          ? 'grid-cols-1 md:grid-cols-3'
          : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={cn('grid gap-3', gridCols)}>
          {visibleColumns.map((col) => (
            <DroppableColumn
              key={col.stage}
              col={col}
              contacts={grouped[col.stage]}
              onLostClick={(c) => {
                setLostFromOffering(deriveStage(c) === 'offering');
                setLostContact(c);
              }}
              onOfferingStageChange={handleOfferingStageChange}
              onOfferingWonClick={(c) => setConvertContact(c)}
              onOfferingLostClick={(c) => {
                setLostFromOffering(true);
                setLostContact(c);
              }}
            />
          ))}
        </div>
      </DndContext>

      {convertContact && (
        <ConvertWonToClientDialog
          open={!!convertContact}
          onOpenChange={(o) => !o && setConvertContact(null)}
          contactId={convertContact.id}
          contactName={convertContact.contact?.full_name ?? 'kontakt'}
          teamId={teamId}
          onSuccess={() => setConvertContact(null)}
        />
      )}

      {lostContact && (
        <LostReasonDialog
          open={!!lostContact}
          onOpenChange={(o) => !o && setLostContact(null)}
          contactId={lostContact.id}
          contactName={lostContact.contact?.full_name ?? 'kontakt'}
          teamId={teamId}
          setOfferingLost={lostFromOffering}
          onSuccess={() => setLostContact(null)}
        />
      )}
    </>
  );
}
