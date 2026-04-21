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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, Filter, Search, X } from 'lucide-react';
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

type SortKey = 'name_asc' | 'name_desc' | 'value_desc' | 'recent';

const SORT_LABELS: Record<SortKey, string> = {
  name_asc: 'Nazwa A→Z',
  name_desc: 'Nazwa Z→A',
  value_desc: 'Wartość ↓',
  recent: 'Najnowsze',
};

const NONE_KEY = '__none__';

function sortContacts(list: DealTeamContact[], sort: SortKey): DealTeamContact[] {
  const arr = [...list];
  switch (sort) {
    case 'name_asc':
      return arr.sort((a, b) =>
        (a.contact?.full_name ?? '').localeCompare(b.contact?.full_name ?? '', 'pl'),
      );
    case 'name_desc':
      return arr.sort((a, b) =>
        (b.contact?.full_name ?? '').localeCompare(a.contact?.full_name ?? '', 'pl'),
      );
    case 'value_desc':
      return arr.sort(
        (a, b) => (b.expected_annual_premium_gr ?? 0) - (a.expected_annual_premium_gr ?? 0),
      );
    case 'recent':
      return arr.sort((a, b) => {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
      });
  }
}

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
  sort,
  onSortChange,
  statusFilter,
  onStatusFilterToggle,
  onStatusFilterClear,
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
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  statusFilter: Set<string>;
  onStatusFilterToggle: (key: string) => void;
  onStatusFilterClear: () => void;
  onLostClick: (c: DealTeamContact) => void;
  onOfferingStageChange: (c: DealTeamContact, next: string) => void;
  onOfferingWonClick: (c: DealTeamContact) => void;
  onOfferingLostClick: (c: DealTeamContact) => void;
  onSubcategoryChange: (c: DealTeamContact, field: 'temperature' | 'prospect_source' | 'client_status', value: string) => void;
  onMoreClick: (c: DealTeamContact) => void;
  taskInfoMap?: Map<string, TaskContactInfo>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.stage });

  const cfg = SUBGROUP_CONFIG[col.stage];

  const filtered = useMemo(() => {
    if (statusFilter.size === 0) return contacts;
    return contacts.filter((c) => {
      const v = cfg.getter(c) ?? NONE_KEY;
      return statusFilter.has(v);
    });
  }, [contacts, statusFilter, cfg]);

  const sorted = useMemo(() => sortContacts(filtered, sort), [filtered, sort]);

  const sumPLN = sorted.reduce(
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
  if (sorted.length === 0) {
    body = (
      <div className="flex items-center justify-center h-full min-h-[200px] text-center p-4">
        <p className="text-sm text-muted-foreground">
          {contacts.length === 0 ? 'Brak kontaktów' : 'Brak wyników dla filtra'}
        </p>
      </div>
    );
  } else if (groupBy) {
    const groups: Record<string, DealTeamContact[]> = {};
    for (const c of sorted) {
      const k = cfg.getter(c) ?? NONE_KEY;
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
    body = <div className="space-y-2">{sorted.map(renderCard)}</div>;
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
            {sorted.length}
            {statusFilter.size > 0 && contacts.length !== sorted.length && (
              <span className="text-muted-foreground">/{contacts.length}</span>
            )}
          </Badge>
          {sumPLN > 0 && (
            <span className="text-xs text-muted-foreground truncate">
              · Σ {plnFormatter.format(sumPLN)}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-7 w-7', statusFilter.size > 0 && 'text-primary')}
                  aria-label="Filtruj statusy"
                  title="Filtruj statusy"
                >
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Statusy</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {cfg.order.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Brak statusów
                  </div>
                ) : (
                  <>
                    {cfg.order.map((key) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={statusFilter.has(key)}
                        onCheckedChange={() => onStatusFilterToggle(key)}
                        onSelect={(e) => e.preventDefault()}
                        className="text-xs"
                      >
                        {cfg.labels[key] ?? key}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuCheckboxItem
                      checked={statusFilter.has(NONE_KEY)}
                      onCheckedChange={() => onStatusFilterToggle(NONE_KEY)}
                      onSelect={(e) => e.preventDefault()}
                      className="text-xs"
                    >
                      (brak)
                    </DropdownMenuCheckboxItem>
                    {statusFilter.size > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <button
                          type="button"
                          onClick={onStatusFilterClear}
                          className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-sm"
                        >
                          Wyczyść filtr
                        </button>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Sortuj"
                  title={`Sortuj: ${SORT_LABELS[sort]}`}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">Sortuj</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(v) => onSortChange(v as SortKey)}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <DropdownMenuRadioItem key={k} value={k} className="text-xs">
                      {SORT_LABELS[k]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="flex-1 p-2 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="min-w-0">{body}</div>
      </div>
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
  const [sortByStage, setSortByStage] = useState<Record<DealStage, SortKey>>({
    prospect: 'recent',
    lead: 'recent',
    offering: 'recent',
    client: 'recent',
    lost: 'recent',
  });
  const [filterByStage, setFilterByStage] = useState<Record<DealStage, Set<string>>>({
    prospect: new Set(),
    lead: new Set(),
    offering: new Set(),
    client: new Set(),
    lost: new Set(),
  });

  const setSortFor = (stage: DealStage, s: SortKey) =>
    setSortByStage((prev) => ({ ...prev, [stage]: s }));
  const toggleFilterFor = (stage: DealStage, key: string) =>
    setFilterByStage((prev) => {
      const next = new Set(prev[stage]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [stage]: next };
    });
  const clearFilterFor = (stage: DealStage) =>
    setFilterByStage((prev) => ({ ...prev, [stage]: new Set() }));

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
              sort={sortByStage[col.stage]}
              onSortChange={(s) => setSortFor(col.stage, s)}
              statusFilter={filterByStage[col.stage]}
              onStatusFilterToggle={(k) => toggleFilterFor(col.stage, k)}
              onStatusFilterClear={() => clearFilterFor(col.stage)}
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
