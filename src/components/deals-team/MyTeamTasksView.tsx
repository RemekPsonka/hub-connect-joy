import { useMemo, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { isPast, isToday, format } from 'date-fns';
import {
  CheckCircle2, User, Building2,
  Plus, Search,
  ChevronDown, ChevronRight, Filter, AlertTriangle, Circle,
  List, LayoutGrid, Users, Columns3,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useMyTeamAssignments, useUpdateAssignment, useCreateAssignment } from '@/hooks/useDealsTeamAssignments';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { useAuth } from '@/contexts/AuthContext';
import type { DealTeamAssignment } from '@/hooks/useDealsTeamAssignments';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { NextActionDialog } from '@/components/deals-team/NextActionDialog';
import { SnoozeDialog } from '@/components/deals-team/SnoozeDialog';
import { ConvertToClientDialog } from '@/components/deals-team/ConvertToClientDialog';
import { UnifiedTaskRow, STATUS_CYCLE, PRIORITY_CONFIG } from '@/components/tasks/UnifiedTaskRow';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MyTeamTasksViewProps {
  teamId: string;
}

type ViewMode = 'grouped' | 'list' | 'kanban' | 'team';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  todo: { label: 'Do zrobienia', color: 'bg-muted' },
  in_progress: { label: 'W trakcie', color: 'bg-blue-500/10' },
  completed: { label: 'Zakończone', color: 'bg-green-500/10' },
  cancelled: { label: 'Anulowane', color: 'bg-muted/50' },
};

// ─── Workflow Column Configuration (from central config) ────
import { WORKFLOW_COLUMNS, type WorkflowColumn } from '@/config/pipelineStages';

// ─── Inline Quick-Add ────────────────────────────────────────
function InlineTaskCreate({ teamId, teamContactId, assignedTo, onCreated }: {
  teamId: string;
  teamContactId: string;
  assignedTo: string;
  onCreated?: () => void;
}) {
  const [value, setValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createAssignment = useCreateAssignment();

  const handleSubmit = async () => {
    if (!value.trim()) return;
    try {
      await createAssignment.mutateAsync({
        teamContactId,
        teamId,
        assignedTo,
        title: value.trim(),
      });
      setValue('');
      setIsAdding(false);
      onCreated?.();
    } catch { /* toast handled in hook */ }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => { setIsAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-2 rounded-b-lg"
      >
        <Plus className="h-3.5 w-3.5" />
        Dodaj zadanie...
      </button>
    );
  }

  return (
    <div className="px-3 py-2 flex items-center gap-2 bg-muted/30">
      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') { setIsAdding(false); setValue(''); }
        }}
        placeholder="Wpisz tytuł i naciśnij Enter"
        className="h-7 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
        autoFocus
      />
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setIsAdding(false); setValue(''); }}>
        Esc
      </Button>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────
export function MyTeamTasksView({ teamId }: MyTeamTasksViewProps) {
  const { director } = useAuth();
  const { data: assignments = [], isLoading } = useMyTeamAssignments(teamId);
  const { data: members = [] } = useTeamMembers(teamId);
  const { data: teamContacts = [] } = useTeamContacts(teamId);
  const updateAssignment = useUpdateAssignment();

  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [filterMember, setFilterMember] = useState<string>('mine');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Universal pipeline workflow dialog states
  const [nextActionOpen, setNextActionOpen] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [workflowTask, setWorkflowTask] = useState<DealTeamAssignment | null>(null);
  const [workflowContact, setWorkflowContact] = useState<{
    contactName: string; contactId: string; teamContactId: string; category: string;
  } | null>(null);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = [...assignments];
    if (filterMember === 'mine') {
      result = result.filter((a) => a.assigned_to === director?.id || (!a.assigned_to && a.owner_id === director?.id));
    } else if (filterMember !== 'all') {
      result = result.filter((a) => a.assigned_to === filterMember);
    }
    if (filterStatus === 'active') {
      result = result.filter((a) => a.status !== 'completed' && a.status !== 'cancelled');
    } else if (filterStatus !== 'all') {
      result = result.filter((a) => a.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      result = result.filter((a) => a.priority === filterPriority);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.contact_name?.toLowerCase().includes(q) ||
        a.contact_company?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [assignments, filterMember, filterStatus, filterPriority, searchQuery, director?.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, { contactName: string; company: string | null; teamContactId: string; tasks: DealTeamAssignment[] }>();
    for (const a of filtered) {
      const key = a.deal_team_contact_id || 'unknown';
      if (!map.has(key)) {
        map.set(key, { contactName: a.contact_name || 'Kontakt', company: a.contact_company || null, teamContactId: key, tasks: [] });
      }
      map.get(key)!.tasks.push(a);
    }
    return Array.from(map.values());
  }, [filtered]);

  // Workflow Kanban columns
  const workflowKanban = useMemo(() => {
    const cols = new Map<string, DealTeamAssignment[]>();
    for (const col of WORKFLOW_COLUMNS) cols.set(col.id, []);
    for (const a of filtered) {
      const cat = a.contact_category;
      const stage = a.contact_offering_stage;
      const matchedCol = WORKFLOW_COLUMNS.find(c => c.match(cat, stage));
      const colId = matchedCol?.id || 'other';
      cols.get(colId)!.push(a);
    }
    return cols;
  }, [filtered]);

  // Team view data
  const teamData = useMemo(() => {
    const map = new Map<string, { name: string; tasks: DealTeamAssignment[] }>();
    for (const a of filtered) {
      const key = a.assigned_to || 'unassigned';
      if (!map.has(key)) {
        const member = members.find(m => m.director_id === key);
        map.set(key, { name: member?.director?.full_name || 'Nieprzypisane', tasks: [] });
      }
      map.get(key)!.tasks.push(a);
    }
    return Array.from(map.entries()).map(([id, data]) => {
      const completed = data.tasks.filter(t => t.status === 'completed').length;
      return { id, ...data, completed, total: data.tasks.length, progress: data.tasks.length > 0 ? Math.round((completed / data.tasks.length) * 100) : 0 };
    });
  }, [filtered, members]);

  const handleStatusChange = useCallback((taskId: string, task: DealTeamAssignment, newStatus: string) => {
    // ALL completed pipeline tasks → open universal NextActionDialog
    if (newStatus === 'completed' && task.deal_team_contact_id) {
      const tc = teamContacts.find(c => c.id === task.deal_team_contact_id);
      if (tc) {
        setWorkflowTask(task);
        setWorkflowContact({
          contactName: tc.contact?.full_name || task.contact_name || '',
          contactId: tc.contact_id,
          teamContactId: tc.id,
          category: tc.category,
        });
        setNextActionOpen(true);
        return;
      }
    }
    updateAssignment.mutate({
      id: taskId, teamContactId: task.deal_team_contact_id || '', status: newStatus,
    });
  }, [teamContacts, updateAssignment]);

  const handleQuickUpdate = (task: DealTeamAssignment, field: string, value: string) => {
    updateAssignment.mutate({
      id: task.id,
      teamContactId: task.deal_team_contact_id || '',
      [field]: value,
    });
  };

  const handleOpenDetail = (task: DealTeamAssignment) => {
    setSelectedTaskId(task.id);
  };

  const overdueCount = assignments.filter(
    (a) => a.due_date && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date)) && a.status !== 'completed' && a.status !== 'cancelled'
  ).length;

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    const a = assignments.find(t => t.id === selectedTaskId);
    if (!a) return null;
    return {
      id: a.id, title: a.title, description: a.description, status: a.status,
      priority: a.priority, due_date: a.due_date, task_type: 'standard',
      created_at: a.created_at, tenant_id: a.tenant_id, owner_id: a.owner_id,
      assigned_to: a.assigned_to, project_id: null, section_id: null,
      category_id: null, visibility: 'private', milestone_id: null,
      completed_at: a.completed_at, sort_order: null, source_task_id: null,
      recurrence_rule: null, deal_team_id: a.deal_team_id,
      deal_team_contact_id: a.deal_team_contact_id, task_contacts: [],
      cross_tasks: [], parent_task_id: null, estimated_hours: null,
    } as any;
  }, [selectedTaskId, assignments]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Toolbar ──────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="h-8 text-xs gap-1">
          <Plus className="h-3.5 w-3.5" />
          Nowe zadanie
        </Button>

        {/* View mode toggle */}
        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} size="sm" className="ml-2">
          <ToggleGroupItem value="grouped" aria-label="Grupowane" className="h-8 px-2.5 text-xs gap-1">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grupowane</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="Lista" className="h-8 px-2.5 text-xs gap-1">
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="Kanban" className="h-8 px-2.5 text-xs gap-1">
            <Columns3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="team" aria-label="Zespół" className="h-8 px-2.5 text-xs gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Zespół</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex-1" />

        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Szukaj..." className="h-8 text-xs pl-7" />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <Filter className="h-3 w-3 mr-1" /><SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="active">Aktywne</SelectItem>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="todo">Do zrobienia</SelectItem>
            <SelectItem value="in_progress">W trakcie</SelectItem>
            <SelectItem value="completed">Zakończone</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue placeholder="Priorytet" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Wszystkie</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ─── Member filter bar ────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={filterMember === 'all' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setFilterMember('all')}>
          Wszyscy
        </Button>
        <Button variant={filterMember === 'mine' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setFilterMember('mine')}>
          Moje
        </Button>
        {members.map((m) => (
          <Button key={m.director_id} variant={filterMember === m.director_id ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setFilterMember(m.director_id)}>
            {m.director?.full_name || 'Nieznany'}
          </Button>
        ))}
        <div className="flex-1" />
        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" />{overdueCount} przeterminowanych
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">{filtered.length} zadań</span>
      </div>

      {/* ─── Empty state ──────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Brak zadań do wyświetlenia</p>
          <p className="text-xs mt-1 mb-4">Utwórz nowe zadanie lub zmień filtry</p>
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />Nowe zadanie
          </Button>
        </div>
      )}

      {/* ─── VIEW: Grouped ────────────────────────────── */}
      {filtered.length > 0 && viewMode === 'grouped' && grouped.map((group) => {
        const isCollapsed = collapsedGroups.has(group.teamContactId);
        return (
          <Card key={group.teamContactId} className="overflow-hidden">
            <button
              onClick={() => toggleGroup(group.teamContactId)}
              className="w-full px-3 py-2 bg-muted/50 border-b flex items-center gap-2 hover:bg-muted/70 transition-colors text-left"
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{group.contactName}</span>
              {group.company && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{group.company}</span>
                </>
              )}
              <Badge variant="secondary" className="text-xs ml-auto">{group.tasks.length}</Badge>
            </button>
            {!isCollapsed && (
              <div>
                {group.tasks.map((task) => (
                  <UnifiedTaskRow
                    key={task.id}
                    task={task}
                    contactName={task.contact_name || undefined}
                    companyName={task.contact_company || undefined}
                    members={members}
                    showAssignee
                    onStatusChange={(taskId, newStatus) => handleStatusChange(taskId, task, newStatus)}
                    onPriorityChange={(taskId, newPriority) => handleQuickUpdate(task, 'priority', newPriority)}
                    onAssigneeChange={(taskId, newAssigneeId) => handleQuickUpdate(task, 'assignedTo', newAssigneeId)}
                    onTitleChange={(taskId, newTitle) => {
                      updateAssignment.mutate({ id: taskId, teamContactId: task.deal_team_contact_id || '', title: newTitle });
                    }}
                    onClick={() => handleOpenDetail(task)}
                  />
                ))}
                <InlineTaskCreate teamId={teamId} teamContactId={group.teamContactId} assignedTo={director?.id || ''} />
              </div>
            )}
          </Card>
        );
      })}

      {/* ─── VIEW: Flat List ──────────────────────────── */}
      {filtered.length > 0 && viewMode === 'list' && (
        <Card className="overflow-hidden">
          {filtered.map((task) => (
            <UnifiedTaskRow
              key={task.id}
              task={task}
              contactName={task.contact_name || undefined}
              companyName={task.contact_company || undefined}
              members={members}
              showAssignee
              onStatusChange={(taskId, newStatus) => handleStatusChange(taskId, task, newStatus)}
              onPriorityChange={(taskId, newPriority) => handleQuickUpdate(task, 'priority', newPriority)}
              onAssigneeChange={(taskId, newAssigneeId) => handleQuickUpdate(task, 'assignedTo', newAssigneeId)}
              onTitleChange={(taskId, newTitle) => {
                updateAssignment.mutate({ id: taskId, teamContactId: task.deal_team_contact_id || '', title: newTitle });
              }}
              onClick={() => handleOpenDetail(task)}
            />
          ))}
        </Card>
      )}

      {/* ─── VIEW: Workflow Kanban ─────────────────────── */}
      {filtered.length > 0 && viewMode === 'kanban' && (
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="flex gap-3 min-w-max">
            {WORKFLOW_COLUMNS.map((col) => {
              const tasks = workflowKanban.get(col.id) || [];
              const colorMap: Record<string, string> = {
                red: 'border-t-red-500', amber: 'border-t-amber-500', blue: 'border-t-blue-500',
                purple: 'border-t-purple-500', slate: 'border-t-slate-400', emerald: 'border-t-emerald-500',
                cyan: 'border-t-cyan-500', gray: 'border-t-gray-400',
              };
              return (
                <div
                  key={col.id}
                  className={cn(
                    'w-[220px] shrink-0 bg-muted/30 rounded-lg border border-t-2 flex flex-col min-h-[400px] max-h-[calc(100vh-300px)]',
                    colorMap[col.color] || 'border-t-primary'
                  )}
                >
                  {/* Header */}
                  <div className="p-2.5 border-b bg-muted/50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{col.icon}</span>
                      <h3 className="font-semibold text-xs truncate">{col.label}</h3>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{tasks.length}</Badge>
                    </div>
                  </div>
                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                    {tasks.length === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-8">Brak zadań</p>
                    )}
                    {tasks.map((task: DealTeamAssignment) => (
                      <Card
                        key={task.id}
                        className="p-2 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleOpenDetail(task)}
                      >
                        <p className="text-xs font-medium leading-tight mb-1 line-clamp-2">{task.title}</p>
                        {task.contact_name && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                            <User className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{task.contact_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.priority && task.priority !== 'medium' && (
                            <Badge variant="outline" className={cn("text-[9px] px-1 py-0", PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.badgeClass)}>
                              {PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.label || task.priority}
                            </Badge>
                          )}
                          {task.due_date && (
                            <span className={cn(
                              "text-[10px]",
                              isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed'
                                ? 'text-destructive font-medium' : 'text-muted-foreground'
                            )}>
                              {format(new Date(task.due_date), 'dd.MM')}
                            </span>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            className="h-4 px-1 text-[9px] ml-auto"
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, task, task.status === 'todo' ? 'in_progress' : 'completed'); }}
                          >
                            {task.status === 'todo' ? '→' : '✓'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── VIEW: Team ───────────────────────────────── */}
      {filtered.length > 0 && viewMode === 'team' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamData.map((member) => (
            <Card key={member.id} className="overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.completed}/{member.total} zakończonych</p>
                  </div>
                </div>
                <Progress value={member.progress} className="h-2" />
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {(['todo', 'in_progress', 'completed'] as const).map((s) => {
                    const count = member.tasks.filter(t => t.status === s).length;
                    if (count === 0) return null;
                    return (
                      <Badge key={s} variant="outline" className="text-[10px]">
                        {STATUS_LABELS[s]?.label}: {count}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              {/* Collapsible task list */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="w-full px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 border-t flex items-center gap-1">
                    <ChevronDown className="h-3 w-3" />
                    Pokaż zadania
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    {member.tasks.map((task) => (
                      <UnifiedTaskRow
                        key={task.id}
                        task={task}
                        contactName={task.contact_name || undefined}
                        companyName={task.contact_company || undefined}
                        compact
                        onStatusChange={(taskId, newStatus) => handleStatusChange(taskId, task, newStatus)}
                        onClick={() => handleOpenDetail(task)}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Task Detail Sheet ────────────────────────── */}
      {selectedTask && (
        <TaskDetailSheet
          open={!!selectedTaskId}
          onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
          task={selectedTask}
          onEdit={() => {}}
        />
      )}

      {/* ─── Create Task Modal ────────────────────────── */}
      <TaskModal open={showCreateModal} onOpenChange={setShowCreateModal} dealTeamId={teamId} />

      {/* ─── Universal Pipeline Workflow Dialogs ─────── */}
      {workflowContact && workflowTask && (
        <>
          <NextActionDialog
            open={nextActionOpen}
            onOpenChange={setNextActionOpen}
            contactName={workflowContact.contactName}
            contactId={workflowContact.contactId}
            teamContactId={workflowContact.teamContactId}
            teamId={teamId}
            existingTaskId={workflowTask.id}
            existingTaskTitle={workflowTask.title}
            onConfirm={() => { setWorkflowTask(null); setWorkflowContact(null); }}
            onSnooze={() => setShowSnooze(true)}
            onConvertToClient={() => setShowConvert(true)}
          />
          <SnoozeDialog
            open={showSnooze}
            onOpenChange={setShowSnooze}
            contactName={workflowContact.contactName}
            onSnooze={async (until, reason) => {
              try {
                updateAssignment.mutate({
                  id: workflowTask.id,
                  teamContactId: workflowContact.teamContactId,
                  status: 'completed',
                });
                toast.success('Kontakt odłożony');
                setShowSnooze(false);
                setWorkflowTask(null);
                setWorkflowContact(null);
              } catch { toast.error('Wystąpił błąd'); }
            }}
          />
          <ConvertToClientDialog
            open={showConvert}
            onOpenChange={setShowConvert}
            teamContactId={workflowContact.teamContactId}
            teamId={teamId}
            contactName={workflowContact.contactName}
          />
        </>
      )}
    </div>
  );
}
