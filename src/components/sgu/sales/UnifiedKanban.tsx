import { useEffect, useMemo, useRef, useState } from 'react';
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
import confetti from 'canvas-confetti';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Progress } from '@/components/ui/progress';
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
import { AlertCircle, ArrowUpDown, Filter, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeamContacts, useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { useActiveTaskContacts, type TaskContactInfo } from '@/hooks/useActiveTaskContacts';
import { useStalledContacts } from '@/hooks/sgu-dashboard/useStalledContacts';
import { useCurrentDirector } from '@/hooks/useDirectors';
import {
  useLastTeamMeeting,
  useMeetingProgress,
  useSaveTeamMeeting,
  useTeamMeetingStreak,
  useOpenTasksSnapshot,
} from '@/hooks/useTeamMeetings';
import { MeetingProgressBar } from './MeetingProgressBar';
import { SaveMeetingDialog } from './SaveMeetingDialog';
import { UnifiedKanbanCard } from './UnifiedKanbanCard';
import { WonPremiumBreakdownDialog } from '@/components/sgu/odprawa/WonPremiumBreakdownDialog';
import { LostReasonDialog } from './LostReasonDialog';
import { SnoozedContactsBar } from '@/components/deals-team/SnoozedContactsBar';
import { MeetingDecisionDialog } from '@/components/deals-team/MeetingDecisionDialog';
import { ContactTasksSheet } from '@/components/deals-team/ContactTasksSheet';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { SignPoaDialog } from './SignPoaDialog';
import {
  TEMPERATURE_LABELS,
  PROSPECT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  OFFERING_STAGE_LABELS,
  type DealTeamContact,
  type DealStage,
} from '@/types/dealTeam';
import {
  deriveKanbanColumn,
  kanbanColumnToCardStage,
  KANBAN_COLUMN_ORDER,
  KANBAN_COLUMN_LABELS,
  KANBAN_COLUMN_ICONS,
  KANBAN_COLUMN_BORDER,
  type KanbanColumn,
} from '@/lib/sgu/deriveKanbanColumn';

interface UnifiedKanbanProps {
  teamId: string;
  filter?: 'prospect' | 'lead' | 'offering' | 'client' | null;
  openSnoozedSignal?: number;
}

interface ColumnDef {
  column: KanbanColumn;
  title: string;
  icon: string;
  borderClass: string;
}

// Sprint S6.5 — 5 kolumn (Prospekt / Cold / Lead / Top / Hot).
// Klient: w /sgu/klienci (NIE w Kanbanie). Lost: ukryty (po Etap 5 osobna zakładka).
const COLUMNS: ColumnDef[] = KANBAN_COLUMN_ORDER.map((c) => ({
  column: c,
  title: KANBAN_COLUMN_LABELS[c],
  icon: KANBAN_COLUMN_ICONS[c],
  borderClass: KANBAN_COLUMN_BORDER[c],
}));

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

const SUBGROUP_CONFIG: Record<KanbanColumn, SubgroupConfig> = {
  prospect: {
    getter: (c) => c.prospect_source,
    labels: PROSPECT_SOURCE_LABELS as Record<string, string>,
    order: ['crm_push', 'cc_meeting', 'ai_krs', 'ai_web', 'csv', 'manual'],
  },
  cold: {
    getter: (c) => c.temperature,
    labels: TEMPERATURE_LABELS as Record<string, string>,
    order: ['hot', 'top', '10x', 'cold'],
  },
  lead: {
    getter: (c) => c.temperature,
    labels: TEMPERATURE_LABELS as Record<string, string>,
    order: ['hot', 'top', '10x', 'cold'],
  },
  top: {
    getter: (c) => c.temperature,
    labels: TEMPERATURE_LABELS as Record<string, string>,
    order: ['hot', 'top', '10x', 'cold'],
  },
  hot: {
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
};

type SortKey = 'name_asc' | 'name_desc' | 'value_desc' | 'recent' | 'temperature';

const SORT_LABELS: Record<SortKey, string> = {
  name_asc: 'Nazwa A→Z',
  name_desc: 'Nazwa Z→A',
  value_desc: 'Wartość ↓',
  recent: 'Najnowsze',
  temperature: 'Temperatura (HOT→COLD)',
};

const TEMPERATURE_ORDER: Record<string, number> = {
  hot: 0,
  top: 1,
  '10x': 2,
  cold: 3,
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
    case 'temperature':
      return arr.sort((a, b) => {
        const oa = TEMPERATURE_ORDER[a.temperature ?? ''] ?? 99;
        const ob = TEMPERATURE_ORDER[b.temperature ?? ''] ?? 99;
        if (oa !== ob) return oa - ob;
        return (a.contact?.full_name ?? '').localeCompare(b.contact?.full_name ?? '', 'pl');
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
  onMeetingDoneClick,
  taskInfo,
  isStalled,
  stalledDaysSinceUpdate,
  stalledStageLabel,
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
  onMeetingDoneClick?: () => void;
  taskInfo?: TaskContactInfo;
  isStalled?: boolean;
  stalledDaysSinceUpdate?: number;
  stalledStageLabel?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: contact.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
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
        onMeetingDoneClick={onMeetingDoneClick}
        isDragging={isDragging}
        taskInfo={taskInfo}
        isStalled={isStalled}
        stalledDaysSinceUpdate={stalledDaysSinceUpdate}
        stalledStageLabel={stalledStageLabel}
        dragListeners={listeners}
        dragAttributes={attributes}
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
  onMeetingDoneClick,
  taskInfoMap,
  columnProgress,
  stalledMap,
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
  onMeetingDoneClick?: (c: DealTeamContact) => void;
  taskInfoMap?: Map<string, TaskContactInfo>;
  columnProgress?: { total: number; done: number };
  stalledMap?: Map<string, { daysSinceUpdate: number; stageLabel: string }>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.column });

  const cfg = SUBGROUP_CONFIG[col.column];

  const filtered = useMemo(() => {
    if (statusFilter.size === 0) return contacts;
    return contacts.filter((c) => {
      const v = cfg.getter(c) ?? NONE_KEY;
      return statusFilter.has(v);
    });
  }, [contacts, statusFilter, cfg]);

  const sorted = useMemo(() => sortContacts(filtered, sort), [filtered, sort]);

  // S6.5: Klient nie pojawia się w Kanbanie — suma wyłącznie z expected_annual_premium_gr.
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
      stage={kanbanColumnToCardStage(col.column)}
      teamId={teamId}
      onLostClick={() => onLostClick(c)}
      onOfferingStageChange={(next) => onOfferingStageChange(c, next)}
      onOfferingWonClick={() => onOfferingWonClick(c)}
      onOfferingLostClick={() => onOfferingLostClick(c)}
      onSubcategoryChange={(field, value) => onSubcategoryChange(c, field, value)}
      onMoreClick={() => onMoreClick(c)}
      onMeetingDoneClick={onMeetingDoneClick ? () => onMeetingDoneClick(c) : undefined}
      taskInfo={taskInfoMap?.get(c.id)}
      isStalled={stalledMap?.has(c.id)}
      stalledDaysSinceUpdate={stalledMap?.get(c.id)?.daysSinceUpdate}
      stalledStageLabel={stalledMap?.get(c.id)?.stageLabel}
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
        {columnProgress && columnProgress.total > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Od odprawy</span>
              <span>
                {columnProgress.done}/{columnProgress.total}
              </span>
            </div>
            <Progress
              value={Math.round((columnProgress.done / columnProgress.total) * 100)}
              className={cn(
                'h-1',
                columnProgress.done === columnProgress.total
                  ? '[&>div]:bg-emerald-500'
                  : '[&>div]:bg-amber-500',
              )}
            />
          </div>
        )}
      </div>
      <div className="flex-1 p-2 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="min-w-0">{body}</div>
      </div>
    </div>
  );
}

export function UnifiedKanban({ teamId, filter, openSnoozedSignal }: UnifiedKanbanProps) {
  const { data: contacts = [], isLoading } = useTeamContacts(teamId);
  const updateContact = useUpdateTeamContact();
  const snoozedRef = useRef<HTMLDivElement>(null);
  const [snoozedExpanded, setSnoozedExpanded] = useState(false);

  useEffect(() => {
    if (openSnoozedSignal && openSnoozedSignal > 0) {
      setSnoozedExpanded(true);
      snoozedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [openSnoozedSignal]);
  const { data: taskInfoMap } = useActiveTaskContacts(teamId);
  const { data: stalledData } = useStalledContacts(teamId);
  const { data: currentDirector } = useCurrentDirector();
  const { data: lastMeeting } = useLastTeamMeeting(teamId);
  const { data: meetingProgress } = useMeetingProgress(lastMeeting?.id);
  const { data: streak = 0 } = useTeamMeetingStreak(teamId);
  const { data: openTasks = [] } = useOpenTasksSnapshot(teamId);
  const saveMeeting = useSaveTeamMeeting();
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [myOverdueOnly, setMyOverdueOnly] = useState(false);
  const prevOverdueCountRef = useRef<number>(0);

  const [convertContact, setConvertContact] = useState<DealTeamContact | null>(null);
  const [lostContact, setLostContact] = useState<DealTeamContact | null>(null);
  const [lostFromOffering, setLostFromOffering] = useState(false);
  const [groupBySubcategory, setGroupBySubcategory] = useState(false);
  const [meetingDoneContact, setMeetingDoneContact] = useState<DealTeamContact | null>(null);
  const [sheetContact, setSheetContact] = useState<DealTeamContact | null>(null);
  const [scheduleMeetingContact, setScheduleMeetingContact] = useState<DealTeamContact | null>(null);
  const [meetingDecisionContact, setMeetingDecisionContact] = useState<DealTeamContact | null>(null);
  const [signPoaContact, setSignPoaContact] = useState<DealTeamContact | null>(null);
  const [search, setSearch] = useState('');
  const [sortByStage, setSortByStage] = useState<Record<KanbanColumn, SortKey>>({
    prospect: 'recent',
    cold: 'recent',
    lead: 'recent',
    top: 'recent',
    hot: 'recent',
  });
  const [filterByStage, setFilterByStage] = useState<Record<KanbanColumn, Set<string>>>({
    prospect: new Set(),
    cold: new Set(),
    lead: new Set(),
    top: new Set(),
    hot: new Set(),
  });

  const setSortFor = (stage: KanbanColumn, s: SortKey) =>
    setSortByStage((prev) => ({ ...prev, [stage]: s }));
  const toggleFilterFor = (stage: KanbanColumn, key: string) =>
    setFilterByStage((prev) => {
      const next = new Set(prev[stage]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [stage]: next };
    });
  const clearFilterFor = (stage: KanbanColumn) =>
    setFilterByStage((prev) => ({ ...prev, [stage]: new Set() }));

  const stalledMap = useMemo(() => {
    const m = new Map<string, { daysSinceUpdate: number; stageLabel: string }>();
    if (!stalledData) return m;
    for (const c of stalledData.contacts) {
      m.set(c.id, { daysSinceUpdate: c.days_since_update, stageLabel: c.offering_stage_label });
    }
    return m;
  }, [stalledData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const { visible, snoozedActive } = useMemo(() => {
    const nowIso = new Date().toISOString();
    // Aktualnie odłożone (przyszłość lub dziś — czekają na crona auto-powrotu)
    const snoozed = contacts.filter(
      (c) => !c.is_lost && c.snoozed_until && c.snoozed_until >= nowIso,
    );
    const baseList = contacts.filter(
      (c) =>
        !c.is_lost &&
        (!c.snoozed_until || c.snoozed_until < nowIso),
    );
    const q = search.trim().toLowerCase();
    let filtered = baseList;
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      filtered = baseList.filter((c) => {
      const haystack = [
        c.contact?.full_name,
        c.contact?.company,
        c.contact?.position,
        c.contact?.email,
        c.contact?.phone,
        c.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return tokens.every((t) => haystack.includes(t));
      });
    }
    if (myOverdueOnly && currentDirector?.id && taskInfoMap) {
      filtered = filtered.filter((c) => {
        const info = taskInfoMap.get(c.id);
        if (!info || info.overdueCount === 0) return false;
        return info.assignees.some((a) => a.id === currentDirector.id);
      });
    }
    return { visible: filtered, snoozedActive: snoozed };
  }, [contacts, search, myOverdueOnly, currentDirector?.id, taskInfoMap]);

  const grouped = useMemo(() => {
    const map: Record<KanbanColumn, DealTeamContact[]> = {
      prospect: [],
      cold: [],
      lead: [],
      top: [],
      hot: [],
    };
    for (const c of visible) {
      const k = deriveKanbanColumn(c);
      if (k) map[k].push(c);
    }
    return map;
  }, [visible]);

  const visibleColumns = useMemo(
    () => {
      if (!filter) return COLUMNS;
      // Map legacy 4-stage filter prop → 5-column subset.
      const map: Record<NonNullable<UnifiedKanbanProps['filter']>, KanbanColumn[]> = {
        prospect: ['prospect'],
        lead: ['cold', 'lead'],
        offering: ['top', 'hot'],
        client: [],
      };
      const allowed = new Set<KanbanColumn>(map[filter] ?? []);
      return COLUMNS.filter((c) => allowed.has(c.column));
    },
    [filter],
  );

  // Confetti when overdue drops from >0 to 0
  const overdueCount = useMemo(() => {
    if (!taskInfoMap) return 0;
    let sum = 0;
    for (const info of taskInfoMap.values()) sum += info.overdueCount;
    return sum;
  }, [taskInfoMap]);

  useEffect(() => {
    const prev = prevOverdueCountRef.current;
    if (prev > 0 && overdueCount === 0) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      toast.success('🎉 Wszystkie overdue domknięte!');
    }
    prevOverdueCountRef.current = overdueCount;
  }, [overdueCount]);

  // Build snapshot of currently open tasks for the team, with column_key derived from contact stage
  const contactById = useMemo(() => {
    const m = new Map<string, DealTeamContact>();
    for (const c of contacts) m.set(c.id, c);
    return m;
  }, [contacts]);

  const openTasksSnapshot = useMemo(
    () =>
      openTasks
        .map((t) => {
          const c = contactById.get(t.deal_team_contact_id);
          if (!c) return null;
          return {
            task_id: t.id,
            team_contact_id: t.deal_team_contact_id,
            column_key: deriveStage(c),
            task_status_at_snapshot: t.status,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [openTasks, contactById],
  );

  const handleSaveMeeting = async (notes: string) => {
    try {
      await saveMeeting.mutateAsync({ teamId, notes, snapshot: openTasksSnapshot });
      setShowMeetingDialog(false);
    } catch {
      // toast handled in hook
    }
  };

  // Sprint S7-v2 — 5-kolumnowy DnD transition matrix (KanbanColumn keys).
  // Cancel dialogu = drop wraca naturalnie (zero DB write — @dnd-kit nie commit'uje).
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const contact = visible.find((c) => c.id === active.id);
    if (!contact) return;

    const fromCol = deriveKanbanColumn(contact);
    const toCol = over.id as KanbanColumn;
    if (!fromCol || !toCol || fromCol === toCol) return;
    if (!KANBAN_COLUMN_ORDER.includes(toCol)) return;

    const fromIdx = KANBAN_COLUMN_ORDER.indexOf(fromCol);
    const toIdx = KANBAN_COLUMN_ORDER.indexOf(toCol);

    if (toIdx < fromIdx) {
      toast.error('Nie można cofnąć kontaktu w Kanbanie. Użyj akcji na karcie kontaktu.');
      return;
    }
    if (toIdx > fromIdx + 1) {
      toast.error("Wymaga wykonania pośrednich milestone'ów.");
      return;
    }

    if (fromCol === 'prospect' && toCol === 'cold') {
      updateContact.mutate({ id: contact.id, teamId, category: 'lead' });
      return;
    }
    if (fromCol === 'cold' && toCol === 'lead') {
      setScheduleMeetingContact(contact);
      return;
    }
    if (fromCol === 'lead' && toCol === 'top') {
      setMeetingDecisionContact(contact);
      return;
    }
    if (fromCol === 'top' && toCol === 'hot') {
      setSignPoaContact(contact);
      return;
    }

    toast.info('Przejście niedostępne — użyj akcji na karcie');
  }

  function handleOfferingStageChange(c: DealTeamContact, next: string) {
    // S7-v2: power_of_attorney wymaga potwierdzenia daty → SignPoaDialog
    if (next === 'power_of_attorney') {
      setSignPoaContact(c);
      return;
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj: nazwisko, firma, stanowisko, email…"
            className="h-8 pl-8 pr-8 text-sm"
            aria-label="Szukaj w lejkach"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {search.trim() && (
            <span className="text-xs text-muted-foreground">
              Znaleziono: {visible.length}
            </span>
          )}
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <Checkbox
              checked={groupBySubcategory}
              onCheckedChange={(v) => setGroupBySubcategory(v === true)}
            />
            Grupuj wg sub-kategorii
          </label>
          <Toggle
            pressed={myOverdueOnly}
            onPressedChange={setMyOverdueOnly}
            size="sm"
            aria-label="Pokaż tylko moje overdue"
            className="h-8 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            Moje overdue
          </Toggle>
        </div>
      </div>

      <MeetingProgressBar
        progress={meetingProgress}
        lastMeetingAt={lastMeeting?.meeting_at ?? null}
        openTasksCount={openTasksSnapshot.length}
        streak={streak}
        onSaveMeeting={() => setShowMeetingDialog(true)}
        isPending={saveMeeting.isPending}
      />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div ref={snoozedRef}>
          <SnoozedContactsBar
            snoozedContacts={snoozedActive}
            teamId={teamId}
            onContactClick={(c) => setSheetContact(c)}
            expanded={snoozedExpanded}
            onExpandedChange={setSnoozedExpanded}
          />
        </div>
        <div className={cn('grid gap-3', gridCols)}>
          {visibleColumns.map((col) => (
            <DroppableColumn
              key={col.column}
              col={col}
              contacts={grouped[col.column]}
              groupBy={groupBySubcategory}
              teamId={teamId}
              sort={sortByStage[col.column]}
              onSortChange={(s) => setSortFor(col.column, s)}
              statusFilter={filterByStage[col.column]}
              onStatusFilterToggle={(k) => toggleFilterFor(col.column, k)}
              onStatusFilterClear={() => clearFilterFor(col.column)}
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
              onMeetingDoneClick={
                currentDirector ? (c: DealTeamContact) => setMeetingDoneContact(c) : undefined
              }
              taskInfoMap={taskInfoMap}
              columnProgress={meetingProgress?.by_column[col.column]}
              stalledMap={stalledMap}
            />
          ))}
        </div>
      </DndContext>

      {convertContact && (
        <WonPremiumBreakdownDialog
          open={!!convertContact}
          onOpenChange={(o) => !o && setConvertContact(null)}
          contactId={convertContact.id}
          teamId={teamId}
          clientName={convertContact.contact?.full_name ?? 'kontakt'}
          current={{
            property: convertContact.potential_property_gr,
            financial: convertContact.potential_financial_gr,
            communication: convertContact.potential_communication_gr,
            life_group: convertContact.potential_life_group_gr,
          }}
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

      <MeetingDecisionDialog
        contactId={meetingDoneContact?.id ?? ''}
        contactDisplayName={meetingDoneContact?.contact?.full_name ?? 'kontakt'}
        open={!!meetingDoneContact}
        onOpenChange={(v) => { if (!v) setMeetingDoneContact(null); }}
      />

      <SaveMeetingDialog
        open={showMeetingDialog}
        onOpenChange={setShowMeetingDialog}
        openTasksCount={openTasksSnapshot.length}
        onConfirm={handleSaveMeeting}
        isPending={saveMeeting.isPending}
      />

      <ContactTasksSheet
        contact={sheetContact}
        teamId={teamId}
        open={!!sheetContact}
        onOpenChange={(open) => !open && setSheetContact(null)}
      />
    </>
  );
}
