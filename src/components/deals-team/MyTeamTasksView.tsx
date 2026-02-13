import { useMemo, useState, useRef, useCallback } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, User, Building2,
  MoreHorizontal, Edit, Plus, Search, MessageSquare, ListChecks,
  ChevronDown, ChevronRight, Filter,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useMyTeamAssignments, useUpdateAssignment, useCreateAssignment } from '@/hooks/useDealsTeamAssignments';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import type { DealTeamAssignment } from '@/hooks/useDealsTeamAssignments';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { useSubtasks } from '@/hooks/useTasks';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MyTeamTasksViewProps {
  teamId: string;
}

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: 'Pilne', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500' },
  high: { label: 'Wysoki', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500' },
  medium: { label: 'Średni', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' },
  low: { label: 'Niski', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300', dot: 'bg-slate-400' },
};

const statusConfig: Record<string, { label: string; icon: typeof Circle; iconColor: string }> = {
  pending: { label: 'Do zrobienia', icon: Circle, iconColor: 'text-muted-foreground' },
  in_progress: { label: 'W trakcie', icon: Clock, iconColor: 'text-blue-500' },
  done: { label: 'Zrobione', icon: CheckCircle2, iconColor: 'text-green-600' },
  cancelled: { label: 'Anulowane', icon: AlertTriangle, iconColor: 'text-muted-foreground' },
};

const statusCycle = ['pending', 'in_progress', 'done'] as const;

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

// ─── Subtask indicator ────────────────────────────────────────
function SubtaskIndicator({ taskId }: { taskId: string }) {
  const { data: subtasks = [] } = useSubtasks(taskId);
  if (subtasks.length === 0) return null;
  const done = subtasks.filter((s: any) => s.status === 'completed').length;
  const total = subtasks.length;
  const pct = Math.round((done / total) * 100);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ListChecks className="h-3 w-3" />
          <span>{done}/{total}</span>
          <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {done} z {total} subtasków ukończonych ({pct}%)
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Task Row ────────────────────────────────────────
function TaskRow({
  task,
  members,
  onStatusCycle,
  onQuickUpdate,
  onOpenDetail,
}: {
  task: DealTeamAssignment;
  members: any[];
  onStatusCycle: (task: DealTeamAssignment) => void;
  onQuickUpdate: (task: DealTeamAssignment, field: string, value: string) => void;
  onOpenDetail: (task: DealTeamAssignment) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const updateAssignment = useUpdateAssignment();

  const pri = priorityConfig[task.priority || 'medium'];
  const st = statusConfig[task.status || 'pending'];
  const StatusIcon = st?.icon || Circle;
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done';
  const isDone = task.status === 'done';

  const assignedMember = members.find(m => m.director_id === task.assigned_to);
  const initials = assignedMember?.director?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?';

  const handleTitleSave = () => {
    if (titleValue.trim() && titleValue !== task.title) {
      updateAssignment.mutate({
        id: task.id,
        teamContactId: task.deal_team_contact_id || '',
        title: titleValue.trim(),
      });
    }
    setEditingTitle(false);
  };

  const getDueDateDisplay = () => {
    if (!task.due_date) return null;
    const d = new Date(task.due_date);
    const colorClass = isPast(d) && !isToday(d) && task.status !== 'done'
      ? 'text-destructive'
      : isToday(d) ? 'text-amber-600' : 'text-muted-foreground';
    return (
      <span className={cn('text-xs flex items-center gap-1', colorClass)}>
        <Clock className="h-2.5 w-2.5" />
        {format(d, 'dd MMM', { locale: pl })}
      </span>
    );
  };

  return (
    <div
      className={cn(
        'px-3 py-2.5 flex items-center gap-3 hover:bg-muted/40 transition-colors group cursor-pointer border-b last:border-b-0',
        isDone && 'opacity-50',
        isOverdue && 'bg-destructive/5'
      )}
      onClick={() => onOpenDetail(task)}
    >
      {/* Status icon */}
      <button
        onClick={(e) => { e.stopPropagation(); onStatusCycle(task); }}
        className="shrink-0 hover:scale-110 transition-transform"
        title={`${st?.label} (kliknij aby zmienić)`}
      >
        <StatusIcon className={cn('h-[18px] w-[18px]', st?.iconColor)} />
      </button>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') { setTitleValue(task.title); setEditingTitle(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-6 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-0 py-0"
            autoFocus
          />
        ) : (
          <p
            className={cn('text-sm truncate', isDone && 'line-through')}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
            title="Kliknij podwójnie, aby edytować tytuł"
          >
            {task.title}
          </p>
        )}
        {task.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">{task.description}</p>
        )}
      </div>

      {/* Metadata chips */}
      <div className="flex items-center gap-2 shrink-0">
        <SubtaskIndicator taskId={task.id} />

        {getDueDateDisplay()}

        {/* Priority dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="shrink-0">
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80', pri?.color)}>
                {pri?.label}
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 bg-popover z-50">
            {Object.entries(priorityConfig).map(([key, val]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onQuickUpdate(task, 'priority', key)}
                className={task.priority === key ? 'bg-accent' : ''}
              >
                <div className={cn('w-2 h-2 rounded-full mr-2', val.dot)} />
                {val.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="shrink-0">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80">
                {st?.label}
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 bg-popover z-50">
            {Object.entries(statusConfig).map(([key, val]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onQuickUpdate(task, 'status', key)}
                className={task.status === key ? 'bg-accent' : ''}
              >
                <val.icon className={cn('h-3.5 w-3.5 mr-2', val.iconColor)} />
                {val.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assigned avatar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="shrink-0">
                  <Avatar className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-popover z-50">
                {members.map((m) => (
                  <DropdownMenuItem
                    key={m.director_id}
                    onClick={() => onQuickUpdate(task, 'assignedTo', m.director_id)}
                    className={task.assigned_to === m.director_id ? 'bg-accent' : ''}
                  >
                    <Avatar className="h-5 w-5 mr-2">
                      <AvatarFallback className="text-[9px]">
                        {m.director?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {m.director?.full_name || 'Nieznany'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {assignedMember?.director?.full_name || 'Nieprzypisany'}
          </TooltipContent>
        </Tooltip>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-popover z-50">
            <DropdownMenuItem onClick={() => onOpenDetail(task)}>
              <Edit className="h-3.5 w-3.5 mr-2" />Szczegóły / Edycja
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditingTitle(true)}>
              <Edit className="h-3.5 w-3.5 mr-2" />Edytuj tytuł
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────
export function MyTeamTasksView({ teamId }: MyTeamTasksViewProps) {
  const { director } = useAuth();
  const { data: assignments = [], isLoading } = useMyTeamAssignments(teamId);
  const { data: members = [] } = useTeamMembers(teamId);
  const updateAssignment = useUpdateAssignment();

  const [filterMember, setFilterMember] = useState<string>('mine');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Task detail sheet
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Task create modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = [...assignments];

    // Member filter
    if (filterMember === 'mine') {
      result = result.filter((a) => a.assigned_to === director?.id);
    } else if (filterMember !== 'all') {
      result = result.filter((a) => a.assigned_to === filterMember);
    }

    // Status filter
    if (filterStatus === 'active') {
      result = result.filter((a) => a.status !== 'done' && a.status !== 'cancelled');
    } else if (filterStatus !== 'all') {
      result = result.filter((a) => a.status === filterStatus);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      result = result.filter((a) => a.priority === filterPriority);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.contact_name?.toLowerCase().includes(q)
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

  const handleStatusCycle = (task: DealTeamAssignment) => {
    const currentIdx = statusCycle.indexOf(task.status as any);
    const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length];
    updateAssignment.mutate({
      id: task.id,
      teamContactId: task.deal_team_contact_id || '',
      status: nextStatus,
    });
  };

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
    (a) => a.due_date && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date)) && a.status !== 'done' && a.status !== 'cancelled'
  ).length;

  // Build a "fake" TaskWithDetails from the selected assignment for TaskDetailSheet
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    const a = assignments.find(t => t.id === selectedTaskId);
    if (!a) return null;
    // Map to TaskWithDetails shape expected by TaskDetailSheet
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status === 'pending' ? 'pending' : a.status === 'done' ? 'completed' : a.status,
      priority: a.priority,
      due_date: a.due_date,
      task_type: 'standard',
      created_at: a.created_at,
      tenant_id: a.tenant_id,
      owner_id: a.owner_id,
      assigned_to: a.assigned_to,
      project_id: null,
      section_id: null,
      category_id: null,
      visibility: 'private',
      milestone_id: null,
      completed_at: a.completed_at,
      sort_order: null,
      source_task_id: null,
      recurrence_rule: null,
      deal_team_id: a.deal_team_id,
      deal_team_contact_id: a.deal_team_contact_id,
      task_contacts: [],
      cross_tasks: [],
      parent_task_id: null,
      estimated_hours: null,
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
        <Button
          onClick={() => setShowCreateModal(true)}
          size="sm"
          className="h-8 text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Nowe zadanie
        </Button>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj..."
            className="h-8 text-xs pl-7"
          />
        </div>

        {/* Status filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="active">Aktywne</SelectItem>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="pending">Do zrobienia</SelectItem>
            <SelectItem value="in_progress">W trakcie</SelectItem>
            <SelectItem value="done">Zrobione</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue placeholder="Priorytet" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Wszystkie</SelectItem>
            {Object.entries(priorityConfig).map(([key, val]) => (
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
      {grouped.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Brak zadań do wyświetlenia</p>
          <p className="text-xs mt-1 mb-4">Utwórz nowe zadanie lub zmień filtry</p>
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />Nowe zadanie
          </Button>
        </div>
      )}

      {/* ─── Grouped task list ────────────────────────── */}
      {grouped.map((group) => {
        const isCollapsed = collapsedGroups.has(group.teamContactId);
        return (
          <Card key={group.teamContactId} className="overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.teamContactId)}
              className="w-full px-3 py-2 bg-muted/50 border-b flex items-center gap-2 hover:bg-muted/70 transition-colors text-left"
            >
              {isCollapsed
                ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              }
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{group.contactName}</span>
              {group.company && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />{group.company}
                  </span>
                </>
              )}
              <Badge variant="secondary" className="text-xs ml-auto">{group.tasks.length}</Badge>
            </button>

            {/* Tasks */}
            {!isCollapsed && (
              <div>
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    onStatusCycle={handleStatusCycle}
                    onQuickUpdate={handleQuickUpdate}
                    onOpenDetail={handleOpenDetail}
                  />
                ))}

                {/* Inline create */}
                <InlineTaskCreate
                  teamId={teamId}
                  teamContactId={group.teamContactId}
                  assignedTo={director?.id || ''}
                />
              </div>
            )}
          </Card>
        );
      })}

      {/* ─── Task Detail Sheet ────────────────────────── */}
      {selectedTask && (
        <TaskDetailSheet
          open={!!selectedTaskId}
          onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
          task={selectedTask}
          onEdit={() => {
            // Could open TaskModal for full edit, but detail sheet already supports inline edit
          }}
        />
      )}

      {/* ─── Create Task Modal ────────────────────────── */}
      <TaskModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        dealTeamId={teamId}
      />
    </div>
  );
}
