import { useMemo, useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, User, Building2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useMyTeamAssignments, useUpdateAssignment } from '@/hooks/useDealsTeamAssignments';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import type { DealTeamAssignment } from '@/hooks/useDealsTeamAssignments';

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

export function MyTeamTasksView({ teamId }: MyTeamTasksViewProps) {
  const { director } = useAuth();
  const { data: assignments = [], isLoading } = useMyTeamAssignments(teamId);
  const { data: members = [] } = useTeamMembers(teamId);
  const updateAssignment = useUpdateAssignment();

  const [filterMember, setFilterMember] = useState<string>('mine');
  const [showCompleted, setShowCompleted] = useState(false);

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

  // Group by contact
  const grouped = useMemo(() => {
    const map = new Map<string, { contactName: string; company: string | null; tasks: DealTeamAssignment[] }>();
    for (const a of filtered) {
      const key = a.deal_team_contact_id || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          contactName: a.contact_name || 'Kontakt',
          company: a.contact_company || null,
          tasks: [],
        });
      }
      map.get(key)!.tasks.push(a);
    }
    return Array.from(map.values());
  }, [filtered]);

  const handleToggle = (assignment: DealTeamAssignment) => {
    updateAssignment.mutate({
      id: assignment.id,
      teamContactId: assignment.deal_team_contact_id || '',
      status: assignment.status === 'done' ? 'pending' : 'done',
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
      {/* Member blocker bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filterMember === 'all' ? 'default' : 'outline'}
          size="sm"
          className="text-xs h-8"
          onClick={() => setFilterMember('all')}
        >
          Wszyscy
        </Button>
        <Button
          variant={filterMember === 'mine' ? 'default' : 'outline'}
          size="sm"
          className="text-xs h-8"
          onClick={() => setFilterMember('mine')}
        >
          Moje
        </Button>
        {members.map((m) => (
          <Button
            key={m.director_id}
            variant={filterMember === m.director_id ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setFilterMember(m.director_id)}
          >
            {m.director?.full_name || 'Nieznany'}
          </Button>
        ))}
      </div>

      {/* Secondary controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant={showCompleted ? 'secondary' : 'outline'}
          size="sm"
          className="text-xs h-8"
          onClick={() => setShowCompleted(!showCompleted)}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Zakończone
        </Button>

        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {overdueCount} przeterminowanych
          </Badge>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} zadań
        </span>
      </div>

      {/* Empty state */}
      {grouped.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Brak zadań do wyświetlenia</p>
          <p className="text-xs mt-1">Dodaj zadania z poziomu kontaktu w Kanbanie</p>
        </div>
      )}

      {/* Grouped tasks */}
      {grouped.map((group, idx) => (
        <Card key={idx} className="overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{group.contactName}</span>
            {group.company && (
              <>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {group.company}
                </span>
              </>
            )}
            <Badge variant="secondary" className="text-xs ml-auto">
              {group.tasks.length}
            </Badge>
          </div>
          <div className="divide-y">
            {group.tasks.map((task) => {
              const pri = priorityConfig[task.priority || 'medium'];
              const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done';
              const isDone = task.status === 'done';

              return (
                <div
                  key={task.id}
                  className={cn(
                    'px-3 py-2 flex items-start gap-2.5 hover:bg-muted/30 transition-colors',
                    isDone && 'opacity-50',
                    isOverdue && 'bg-destructive/5'
                  )}
                >
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => handleToggle(task)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', isDone && 'line-through')}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.due_date && (
                        <span className={cn('text-xs flex items-center gap-1', getDueDateClass(task.due_date))}>
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(task.due_date), 'dd MMM', { locale: pl })}
                        </span>
                      )}
                      {pri && (
                        <Badge variant="outline" className={cn('text-[10px] px-1 py-0', pri.color)}>
                          {pri.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
