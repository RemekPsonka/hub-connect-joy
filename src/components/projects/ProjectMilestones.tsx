import { useState } from 'react';
import { DataCard } from '@/components/ui/data-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Diamond, Plus, MoreHorizontal, Trash2, CheckCircle2, Clock, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from '@/hooks/useProjectMilestones';
import { useTasks } from '@/hooks/useTasks';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectMilestonesProps {
  projectId: string;
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  pending: { label: 'Oczekuje', icon: Circle, color: 'text-muted-foreground' },
  in_progress: { label: 'W toku', icon: Clock, color: 'text-primary' },
  completed: { label: 'Ukończony', icon: CheckCircle2, color: 'text-success' },
};

const taskStatusIcons: Record<string, { icon: typeof Circle; color: string }> = {
  todo: { icon: Circle, color: 'text-muted-foreground' },
  in_progress: { icon: Clock, color: 'text-primary' },
  completed: { icon: CheckCircle2, color: 'text-success' },
};

export function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
  const { data: milestones = [], isLoading } = useProjectMilestones(projectId);
  const { data: allTasks = [] } = useTasks({ projectId });
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createMilestone.mutateAsync({
        projectId,
        name: newName.trim(),
        due_date: newDueDate || undefined,
      });
      setNewName('');
      setNewDueDate('');
      setIsAdding(false);
    } catch {}
  };

  const cycleStatus = (milestone: { id: string; status: string }) => {
    const order = ['pending', 'in_progress', 'completed'];
    const next = order[(order.indexOf(milestone.status) + 1) % order.length];
    updateMilestone.mutate({ id: milestone.id, projectId, status: next });
  };

  const toggleExpanded = (id: string) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTasksForMilestone = (milestoneId: string) => {
    return allTasks.filter((t: TaskWithDetails) => (t as any).milestone_id === milestoneId);
  };

  if (isLoading) return null;

  return (
    <DataCard
      title="Kamienie milowe"
      action={
        <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-1" /> Dodaj
        </Button>
      }
    >
      {isAdding && (
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Nazwa..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="h-8 text-sm"
            autoFocus
          />
          <Input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
          <Button size="sm" className="h-8" onClick={handleAdd} disabled={createMilestone.isPending}>
            Dodaj
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsAdding(false)}>
            Anuluj
          </Button>
        </div>
      )}

      {milestones.length === 0 && !isAdding ? (
        <EmptyState
          icon={Diamond}
          title="Brak kamieni milowych"
          description="Dodaj kamienie milowe, aby śledzić kluczowe etapy projektu."
          action={{ label: 'Dodaj kamień milowy', onClick: () => setIsAdding(true), icon: Plus }}
        />
      ) : (
        <div className="space-y-1">
          {milestones.map((m) => {
            const cfg = statusConfig[m.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const tasks = getTasksForMilestone(m.id);
            const completedTasks = tasks.filter((t: TaskWithDetails) => t.status === 'completed').length;
            const totalTasks = tasks.length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const isExpanded = expandedMilestones.has(m.id);

            return (
              <Collapsible key={m.id} open={isExpanded} onOpenChange={() => toggleExpanded(m.id)}>
                <div className="rounded-lg border bg-card">
                  <div className="flex items-center gap-3 py-2.5 px-3">
                    <button onClick={() => cycleStatus(m)} className="shrink-0">
                      <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                    </button>
                    <Diamond className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm font-medium truncate', m.status === 'completed' && 'line-through text-muted-foreground')}>
                          {m.name}
                        </p>
                        {totalTasks > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {completedTasks}/{totalTasks}
                          </span>
                        )}
                      </div>
                      {totalTasks > 0 && (
                        <Progress value={progress} className="h-1.5 mt-1" />
                      )}
                      {m.due_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(m.due_date), 'd MMM yyyy', { locale: pl })}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {cfg.label}
                    </Badge>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </Button>
                    </CollapsibleTrigger>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => deleteMilestone.mutate({ id: m.id, projectId })}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Usuń
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1 border-t">
                      {tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2">
                          Brak przypisanych zadań. Przypisz zadania do tego kamienia milowego w formularzu zadania.
                        </p>
                      ) : (
                        <div className="space-y-1 mt-1">
                          {tasks.map((t: TaskWithDetails) => {
                            const ts = taskStatusIcons[t.status || 'todo'] || taskStatusIcons.todo;
                            const TaskIcon = ts.icon;
                            return (
                              <div key={t.id} className="flex items-center gap-2 py-1 text-sm">
                                <TaskIcon className={cn('h-3.5 w-3.5 shrink-0', ts.color)} />
                                <span className={cn('truncate', t.status === 'completed' && 'line-through text-muted-foreground')}>
                                  {t.title}
                                </span>
                                {t.due_date && (
                                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                                    {format(new Date(t.due_date), 'd MMM', { locale: pl })}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </DataCard>
  );
}
