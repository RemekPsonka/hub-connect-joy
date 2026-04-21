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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useTeamContacts, useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useActiveTaskContacts, type TaskContactInfo } from '@/hooks/useActiveTaskContacts';
import { UnifiedKanbanCard } from './UnifiedKanbanCard';
import { ConvertWonToClientDialog } from './ConvertWonToClientDialog';
import { LostReasonDialog } from './LostReasonDialog';
import { ContactTasksSheet } from '@/components/deals-team/ContactTasksSheet';
import {
  TEMPERATURE_LABELS,
  PROSPECT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  OFFERING_STAGE_LABELS,
  type DealTeamContact,
  type DealStage,
} from '@/types/dealTeam';

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

export function deriveStage(c: DealTeamContact): DealStage {
  if (c.deal_stage) return c.deal_stage;
  const cat = c.category;
  if (cat === 'client') return 'client';
  if (cat === 'offering' || cat === 'audit') return 'offering';
  if (['lead', 'hot', 'top', 'cold', '10x'].includes(cat)) return 'lead';
  if (cat === 'lost') return 'lost';
  return 'prospect';
}

interface SubgroupConfig {
  getter: (c: DealTeamContact) => string | null | undefined;
  labels: Record<string, string>;
  order: string[];
}

const SUBGROUP_CONFIG: Record<DealStage, SubgroupConfig> = {
  prospect: {
    getter: (c) => c.prospect_source,
    labels: PROSPECT_SOURCE_LABELS as Record<string, string>,
    order: ['crm_push', 'cc_meeting', 'ai_krs', 'ai_web', 'csv', 'manual'],
  },
  lead: {
    getter: (c) => c.temperature,
    labels: TEMPERATURE_LABELS as Record<string, string>,
    order: ['hot', 'top', '10x', 'cold'],
  },
  offering: {
    getter: (c) => c.offering_stage,
    labels: OFFERING_STAGE_LABELS as Record<string, string>,
    order: [
      'decision_meeting',
      'handshake',
      'power_of_attorney',
      'audit',
      'offer_sent',
      'negotiation',
      'won',
      'lost',
    ],
  },
  client: {
    getter: (c) => c.client_status,
    labels: CLIENT_STATUS_LABELS as Record<string, string>,
    order: ['ambassador', 'standard', 'lost'],
  },
  lost: {
    getter: () => null,
    labels: {},
    order: [],
  },
};

function DraggableCard({
  contact,
  stage,
  teamId,
  onLostClick,
  onOfferingStageChange,
  onOfferingWonClick,
  onOfferingLostClick,
  onSubcategoryChange,
  onMoreClick,
  taskInfo,
}: {
  contact: DealTeamContact;
  stage: DealStage;
  teamId: string;
  onLostClick: () => void;
  onOfferingStageChange: (next: string) => void;
  onOfferingWonClick: () => void;
  onOfferingLostClick: () => void;
  onSubcategoryChange: (field: 'temperature' | 'prospect_source' | 'client_status', value: string) => void;
  onMoreClick: () => void;
  taskInfo?: TaskContactInfo;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: contact.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="min-w-0">
      <UnifiedKanbanCard
        contact={contact}
        stage={stage}
        teamId={teamId}
        onLostClick={onLostClick}
        onOfferingStageChange={onOfferingStageChange}
        onOfferingWonClick={onOfferingWonClick}
        onOfferingLostClick={onOfferingLostClick}
        onSubcategoryChange={onSubcategoryChange}
        onMoreClick={onMoreClick}
        isDragging={isDragging}
        taskInfo={taskInfo}
      />
    </div>
  );
}

function DroppableColumn({
  col,
  contacts,
  groupBy,
  teamId,
  onLostClick,
  onOfferingStageChange,
  onOfferingWonClick,
  onOfferingLostClick,
  onSubcategoryChange,
  onMoreClick,
  taskInfoMap,
}: {
  col: ColumnDef;
  contacts: DealTeamContact[];
  groupBy: boolean;
  teamId: string;
  onLostClick: (c: DealTeamContact) => void;
  onOfferingStageChange: (c: DealTeamContact, next: string) => void;
  onOfferingWonClick: (c: DealTeamContact) => void;
  onOfferingLostClick: (c: DealTeamContact) => void;
  onSubcategoryChange: (c: DealTeamContact, field: 'temperature' | 'prospect_source' | 'client_status', value: string) => void;
  onMoreClick: (c: DealTeamContact) => void;
  taskInfoMap?: Map<string, TaskContactInfo>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.stage });

  const sumPLN = contacts.reduce(
    (acc, c) => acc + ((c.expected_annual_premium_gr ?? 0) / 100),
    0,
  );
  const plnFormatter = new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  });

  const renderCard = (c: DealTeamContact) => (
    <DraggableCard
      key={c.id}
      contact={c}
      stage={col.stage}
      teamId={teamId}
      onLostClick={() => onLostClick(c)}
      onOfferingStageChange={(next) => onOfferingStageChange(c, next)}
      onOfferingWonClick={() => onOfferingWonClick(c)}
      onOfferingLostClick={() => onOfferingLostClick(c)}
      onSubcategoryChange={(field, value) => onSubcategoryChange(c, field, value)}
      onMoreClick={() => onMoreClick(c)}
      taskInfo={taskInfoMap?.get(c.id)}
    />
  );

  let body: JSX.Element;
  if (contacts.length === 0) {
    body = (
      <div className="flex items-center justify-center h-full min-h-[200px] text-center p-4">
        <p className="text-sm text-muted-foreground">Brak kontaktów</p>
      </div>
    );
  } else if (groupBy) {
    const cfg = SUBGROUP_CONFIG[col.stage];
    const groups: Record<string, DealTeamContact[]> = {};
    for (const c of contacts) {
      const k = cfg.getter(c) ?? '__none__';
      (groups[k] ??= []).push(c);
    }
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ia = cfg.order.indexOf(a);
      const ib = cfg.order.indexOf(b);
      const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
      const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
      return ra - rb;
    });
    body = (
      <div className="space-y-3">
        {sortedKeys.map((k) => (
          <div key={k} className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground px-1">
              {cfg.labels[k] ?? '(brak)'} ({groups[k].length})
            </div>
            <div className="space-y-2">{groups[k].map(renderCard)}</div>
          </div>
        ))}
      </div>
    );
  } else {
    body = <div className="space-y-2">{contacts.map(renderCard)}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-muted/30 rounded-lg border border-t-2 flex flex-col min-h-[400px] max-h-[calc(100vh-320px)] min-w-0 overflow-hidden transition-colors',
        col.borderClass,
        isOver && 'ring-2 ring-primary/50 bg-primary/5',
      )}
    >
      <div className="p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-lg">{col.icon}</span>
          <h3 className="font-semibold text-sm truncate">{col.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
          {sumPLN > 0 && (
            <span className="text-xs text-muted-foreground truncate">
              · Σ {plnFormatter.format(sumPLN)}
            </span>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 p-2 min-w-0">
        <div className="min-w-0">{body}</div>
      </ScrollArea>
    </div>
  );
}

export function UnifiedKanban({ teamId, filter }: UnifiedKanbanProps) {
  const { data: contacts = [], isLoading } = useTeamContacts(teamId);
  const updateContact = useUpdateTeamContact();
  const { data: taskInfoMap } = useActiveTaskContacts(teamId);

  const [convertContact, setConvertContact] = useState<DealTeamContact | null>(null);
  const [lostContact, setLostContact] = useState<DealTeamContact | null>(null);
  const [lostFromOffering, setLostFromOffering] = useState(false);
  const [groupBySubcategory, setGroupBySubcategory] = useState(false);
  const [sheetContact, setSheetContact] = useState<DealTeamContact | null>(null);

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

  function handleSubcategoryChange(
    c: DealTeamContact,
    field: 'temperature' | 'prospect_source' | 'client_status',
    value: string,
  ) {
    if (field === 'temperature') {
      updateContact.mutate({ id: c.id, teamId, temperature: value as DealTeamContact['temperature'] });
    } else if (field === 'prospect_source') {
      updateContact.mutate({ id: c.id, teamId, prospectSource: value as DealTeamContact['prospect_source'] });
    } else {
      updateContact.mutate({ id: c.id, teamId, clientStatus: value });
    }
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
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <Checkbox
            checked={groupBySubcategory}
            onCheckedChange={(v) => setGroupBySubcategory(v === true)}
          />
          Grupuj wg sub-kategorii
        </label>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={cn('grid gap-3', gridCols)}>
          {visibleColumns.map((col) => (
            <DroppableColumn
              key={col.stage}
              col={col}
              contacts={grouped[col.stage]}
              groupBy={groupBySubcategory}
              teamId={teamId}
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
              onSubcategoryChange={handleSubcategoryChange}
              onMoreClick={(c) => setSheetContact(c)}
              taskInfoMap={taskInfoMap}
            />
          ))}
        </div>
      </DndContext>

      <ContactTasksSheet
        contact={sheetContact}
        teamId={teamId}
        open={sheetContact !== null}
        onOpenChange={(open) => !open && setSheetContact(null)}
      />

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
