import { useMemo, useState, useCallback } from 'react';
import { startOfDay } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, Plus, Search, ChevronDown, ChevronRight, Filter, AlertTriangle,
  List, LayoutGrid,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMyTeamAssignments, useUpdateAssignment } from '@/hooks/useDealsTeamAssignments';
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
import { UnifiedTaskRow, PRIORITY_CONFIG } from '@/components/tasks/UnifiedTaskRow';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { bucketOfTask } from '@/lib/sguTaskBuckets';
import { MyClientsSection } from '@/components/sgu/MyClientsSection';

interface MyTeamTasksViewProps {
  teamId: string;
}

type ViewMode = 'grouped' | 'list';

// ─── Main View ────────────────────────────────────────
export function MyTeamTasksView({ teamId }: MyTeamTasksViewProps) {
  const { director } = useAuth();
  const { data: assignments = [], isLoading } = useMyTeamAssignments(teamId);
  const { data: members = [] } = useTeamMembers(teamId);
  const { data: teamContacts = [] } = useTeamContacts(teamId);
  const updateAssignment = useUpdateAssignment();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlBucket = searchParams.get('bucket') as
    | 'today' | 'overdue' | 'upcoming' | 'done_today' | 'mine_clients' | null;

  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [filterMember, setFilterMember] = useState<string>('mine');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [restOpen, setRestOpen] = useState(false);

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

  const filtered = useMemo(() => {
    let result = [...assignments];
    if (filterMember === 'mine') {
      result = result.filter((a) => a.assigned_to === director?.id || (!a.assigned_to && a.owner_id === director?.id));
    } else if (filterMember !== 'all') {
      result = result.filter((a) => a.assigned_to === filterMember);
    }
    const bucketIsDoneToday = urlBucket === 'done_today';
    if (filterStatus === 'active' && !bucketIsDoneToday) {
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
    if (urlBucket === 'today' || urlBucket === 'overdue' || urlBucket === 'upcoming') {
      result = result.filter((a) => bucketOfTask(a) === urlBucket);
    } else if (urlBucket === 'done_today') {
      const startIso = startOfDay(new Date()).toISOString();
      result = result.filter(
        (a) => a.status === 'completed' && (a.completed_at ?? '') >= startIso,
      );
    }
    return result;
  }, [assignments, filterMember, filterStatus, filterPriority, searchQuery, director?.id, urlBucket]);

  // Time-based grouping
  const buckets = useMemo(() => {
    const today: DealTeamAssignment[] = [];
    const overdue: DealTeamAssignment[] = [];
    const upcoming: DealTeamAssignment[] = [];
    const rest: DealTeamAssignment[] = [];
    for (const t of filtered) {
      const b = bucketOfTask(t);
      if (b === 'today') today.push(t);
      else if (b === 'overdue') overdue.push(t);
      else if (b === 'upcoming') upcoming.push(t);
      else rest.push(t);
    }
    return { today, overdue, upcoming, rest };
  }, [filtered]);

  const handleStatusChange = useCallback((taskId: string, task: DealTeamAssignment, newStatus: string) => {
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

  const overdueCount = buckets.overdue.length;

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
      deal_team_contact_id: a.deal_team_contact_id, task_contacts: a.contact_id ? [{
        contacts: {
          id: a.contact_id,
          full_name: a.contact_name || '',
          company: a.contact_company || null,
        }
      }] : [],
      cross_tasks: [], parent_task_id: null, estimated_hours: null,
    } as any;
  }, [selectedTaskId, assignments]);

  const buildBadge = (task: DealTeamAssignment) => {
    if (!task.contact_category) return undefined;
    return {
      stage: task.contact_category,
      subCategory:
        task.contact_temperature ??
        task.contact_offering_stage ??
        task.contact_client_status ??
        undefined,
    };
  };

  const renderTaskRow = (task: DealTeamAssignment) => (
    <UnifiedTaskRow
      key={task.id}
      task={task}
      contactName={task.contact_name || undefined}
      companyName={task.contact_company || undefined}
      members={members}
      showAssignee
      dealStageBadge={buildBadge(task)}
      onStatusChange={(taskId, newStatus) => handleStatusChange(taskId, task, newStatus)}
      onPriorityChange={(taskId, newPriority) => handleQuickUpdate(task, 'priority', newPriority)}
      onAssigneeChange={(taskId, newAssigneeId) => handleQuickUpdate(task, 'assignedTo', newAssigneeId)}
      onTitleChange={(taskId, newTitle) => {
        updateAssignment.mutate({ id: taskId, teamContactId: task.deal_team_contact_id || '', title: newTitle });
      }}
      onClick={() => handleOpenDetail(task)}
    />
  );

  const renderSection = (
    title: string,
    tasks: DealTeamAssignment[],
    defaultOpen: boolean,
    variant: 'today' | 'overdue' | 'upcoming' | 'rest',
    lazy = false,
  ) => {
    const headerColor =
      variant === 'overdue' ? 'text-destructive'
      : variant === 'today' ? 'text-foreground'
      : 'text-muted-foreground';
    const badgeVariant = variant === 'overdue' && tasks.length > 0 ? 'destructive' : 'secondary';

    return (
      <Collapsible defaultOpen={defaultOpen}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full px-3 py-2 bg-muted/50 border-b flex items-center gap-2 hover:bg-muted/70 transition-colors text-left group">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-90" />
              <span className={cn('text-sm font-medium', headerColor)}>{title}</span>
              <Badge variant={badgeVariant} className="text-xs ml-auto">{tasks.length}</Badge>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {tasks.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">Brak zadań</p>
            ) : (
              <div>
                {/* Lazy = render only when open via CollapsibleContent's mount-on-open behavior */}
                {tasks.map(renderTaskRow)}
              </div>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

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

      {/* ─── VIEW: Grouped (4 time buckets) ────────────── */}
      {filtered.length > 0 && viewMode === 'grouped' && (
        <div className="space-y-3">
          {renderSection('Dzisiaj', buckets.today, true, 'today')}
          {renderSection('Zaległe', buckets.overdue, buckets.overdue.length > 0, 'overdue')}
          {renderSection('Nadchodzące 7 dni', buckets.upcoming, false, 'upcoming')}
          {/* Rest: lazy — only render rows when section opened */}
          <Collapsible open={restOpen} onOpenChange={setRestOpen}>
            <Card className="overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full px-3 py-2 bg-muted/50 border-b flex items-center gap-2 hover:bg-muted/70 transition-colors text-left">
                  {restOpen
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <span className="text-sm font-medium text-muted-foreground">Wszystkie</span>
                  <Badge variant="secondary" className="text-xs ml-auto">{buckets.rest.length}</Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {restOpen && (
                  buckets.rest.length === 0
                    ? <p className="px-3 py-4 text-xs text-muted-foreground text-center">Brak zadań</p>
                    : <div>{buckets.rest.map(renderTaskRow)}</div>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      )}

      {/* ─── VIEW: Flat List ──────────────────────────── */}
      {filtered.length > 0 && viewMode === 'list' && (
        <Card className="overflow-hidden">
          {filtered.map(renderTaskRow)}
        </Card>
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
            onSnooze={() => { setShowSnooze(false); setNextActionOpen(false); setWorkflowTask(null); setWorkflowContact(null); }}
          />
          <ConvertToClientDialog
            open={showConvert}
            onOpenChange={(open) => {
              setShowConvert(open);
              if (!open) { setNextActionOpen(false); setWorkflowTask(null); setWorkflowContact(null); }
            }}
            teamContactId={workflowContact.teamContactId}
            teamId={teamId}
            contactName={workflowContact.contactName}
          />
        </>
      )}
    </div>
  );
}
