import { useMemo, useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, User, Building2,
  MoreHorizontal, Edit, CalendarIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useMyTeamAssignments, useUpdateAssignment } from '@/hooks/useDealsTeamAssignments';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import type { DealTeamAssignment } from '@/hooks/useDealsTeamAssignments';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MyTeamTasksViewProps {
  teamId: string;
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Pilne', color: 'bg-red-100 text-red-800' },
  high: { label: 'Wysoki', color: 'bg-orange-100 text-orange-800' },
  medium: { label: 'Średni', color: 'bg-blue-100 text-blue-800' },
  low: { label: 'Niski', color: 'bg-slate-100 text-slate-800' },
};

const statusConfig: Record<string, { label: string; icon: typeof Circle }> = {
  pending: { label: 'Do zrobienia', icon: Circle },
  in_progress: { label: 'W trakcie', icon: Clock },
  done: { label: 'Zrobione', icon: CheckCircle2 },
  cancelled: { label: 'Anulowane', icon: AlertTriangle },
};

const statusCycle = ['pending', 'in_progress', 'done'] as const;

export function MyTeamTasksView({ teamId }: MyTeamTasksViewProps) {
  const { director } = useAuth();
  const { data: assignments = [], isLoading } = useMyTeamAssignments(teamId);
  const { data: members = [] } = useTeamMembers(teamId);
  const updateAssignment = useUpdateAssignment();

  const [filterMember, setFilterMember] = useState<string>('mine');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState<DealTeamAssignment | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editStatus, setEditStatus] = useState('pending');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>();
  const [editAssignedTo, setEditAssignedTo] = useState('');

  const openEditDialog = (task: DealTeamAssignment) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'medium');
    setEditStatus(task.status || 'pending');
    setEditDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setEditAssignedTo(task.assigned_to || '');
  };

  const saveEdit = () => {
    if (!editingTask) return;
    updateAssignment.mutate({
      id: editingTask.id,
      teamContactId: editingTask.deal_team_contact_id || '',
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      status: editStatus,
      dueDate: editDueDate ? editDueDate.toISOString().split('T')[0] : null,
      assignedTo: editAssignedTo || undefined,
    });
    setEditingTask(null);
  };

  const filtered = useMemo(() => {
    let result = [...assignments];
    if (filterMember === 'mine') {
      result = result.filter((a: DealTeamAssignment) => a.assigned_to === director?.id);
    } else if (filterMember !== 'all') {
      result = result.filter((a: DealTeamAssignment) => a.assigned_to === filterMember);
    }
    if (!showCompleted) {
      result = result.filter((a: DealTeamAssignment) => a.status !== 'done' && a.status !== 'cancelled');
    }
    return result;
  }, [assignments, filterMember, director?.id, showCompleted]);

  const grouped = useMemo(() => {
    const map = new Map<string, { contactName: string; company: string | null; tasks: DealTeamAssignment[] }>();
    for (const a of filtered) {
      const key = a.deal_team_contact_id || 'unknown';
      if (!map.has(key)) {
        map.set(key, { contactName: a.contact_name || 'Kontakt', company: a.contact_company || null, tasks: [] });
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

  const getDueDateClass = (dueDate: string | null) => {
    if (!dueDate) return '';
    const d = new Date(dueDate);
    if (isPast(d) && !isToday(d)) return 'text-destructive font-medium';
    if (isToday(d)) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const overdueCount = assignments.filter(
    (a: DealTeamAssignment) => a.due_date && isPast(new Date(a.due_date)) && !isToday(new Date(a.due_date)) && a.status !== 'done' && a.status !== 'cancelled'
  ).length;

  const getMemberName = (directorId: string | null) => {
    if (!directorId) return 'Nieprzypisany';
    const m = members.find((m) => m.director_id === directorId);
    return m?.director?.full_name || 'Nieznany';
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
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={filterMember === 'all' ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setFilterMember('all')}>Wszyscy</Button>
        <Button variant={filterMember === 'mine' ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setFilterMember('mine')}>Moje</Button>
        {members.map((m) => (
          <Button key={m.director_id} variant={filterMember === m.director_id ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setFilterMember(m.director_id)}>
            {m.director?.full_name || 'Nieznany'}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button variant={showCompleted ? 'secondary' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setShowCompleted(!showCompleted)}>
          <CheckCircle2 className="h-3 w-3 mr-1" />Zakończone
        </Button>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />{overdueCount} przeterminowanych</Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} zadań</span>
      </div>

      {grouped.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Brak zadań do wyświetlenia</p>
          <p className="text-xs mt-1">Dodaj zadania z poziomu kontaktu w Kanbanie</p>
        </div>
      )}

      {grouped.map((group, idx) => (
        <Card key={idx} className="overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{group.contactName}</span>
            {group.company && (
              <>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{group.company}</span>
              </>
            )}
            <Badge variant="secondary" className="text-xs ml-auto">{group.tasks.length}</Badge>
          </div>
          <div className="divide-y">
            {group.tasks.map((task) => {
              const pri = priorityConfig[task.priority || 'medium'];
              const st = statusConfig[task.status || 'pending'];
              const StatusIcon = st?.icon || Circle;
              const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done';
              const isDone = task.status === 'done';

              return (
                <div
                  key={task.id}
                  className={cn(
                    'px-3 py-2 flex items-start gap-2.5 hover:bg-muted/30 transition-colors group',
                    isDone && 'opacity-50',
                    isOverdue && 'bg-destructive/5'
                  )}
                >
                  {/* Status icon - clickable for cycling */}
                  <button
                    onClick={() => handleStatusCycle(task)}
                    className="mt-0.5 shrink-0"
                    title={`Status: ${st?.label || task.status} (kliknij aby zmienić)`}
                  >
                    <StatusIcon className={cn(
                      'h-4 w-4 transition-colors',
                      task.status === 'done' && 'text-green-600',
                      task.status === 'in_progress' && 'text-blue-500',
                      task.status === 'pending' && 'text-muted-foreground',
                    )} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', isDone && 'line-through')}>{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.due_date && (
                        <span className={cn('text-xs flex items-center gap-1', getDueDateClass(task.due_date))}>
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(task.due_date), 'dd MMM', { locale: pl })}
                        </span>
                      )}
                      {pri && (
                        <Badge variant="outline" className={cn('text-[10px] px-1 py-0', pri.color)}>{pri.label}</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{st?.label}</Badge>
                    </div>
                  </div>

                  {/* Context menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-popover z-50">
                      <DropdownMenuItem onClick={() => openEditDialog(task)}>
                        <Edit className="h-3.5 w-3.5 mr-2" />Edytuj
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-popover z-50">
                          {Object.entries(statusConfig).map(([key, val]) => (
                            <DropdownMenuItem key={key} onClick={() => handleQuickUpdate(task, 'status', key)} className={task.status === key ? 'bg-accent' : ''}>
                              <val.icon className="h-3.5 w-3.5 mr-2" />{val.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Priorytet</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-popover z-50">
                          {Object.entries(priorityConfig).map(([key, val]) => (
                            <DropdownMenuItem key={key} onClick={() => handleQuickUpdate(task, 'priority', key)} className={task.priority === key ? 'bg-accent' : ''}>
                              <Badge variant="outline" className={cn('text-[10px] px-1 py-0 mr-2', val.color)}>{val.label}</Badge>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Przypisz do</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-popover z-50">
                          {members.map((m) => (
                            <DropdownMenuItem key={m.director_id} onClick={() => handleQuickUpdate(task, 'assignedTo', m.director_id)} className={task.assigned_to === m.director_id ? 'bg-accent' : ''}>
                              {m.director?.full_name || 'Nieznany'}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* Edit dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edytuj zadanie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tytuł</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Opis</label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {Object.entries(statusConfig).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Priorytet</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {Object.entries(priorityConfig).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Termin</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !editDueDate && 'text-muted-foreground')}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {editDueDate ? format(editDueDate, 'dd MMM yyyy', { locale: pl }) : 'Wybierz'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Przypisany do</label>
                <Select value={editAssignedTo} onValueChange={setEditAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {members.map((m) => (
                      <SelectItem key={m.director_id} value={m.director_id}>{m.director?.full_name || 'Nieznany'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Anuluj</Button>
            <Button onClick={saveEdit} disabled={!editTitle.trim()}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
