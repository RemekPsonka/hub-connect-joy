import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GitBranch, Plus, X, Loader2, AlertTriangle, ArrowRight, Link2 } from 'lucide-react';
import { useTaskDependencies, useCreateTaskDependency, useDeleteTaskDependency } from '@/hooks/useTaskDependencies';
import { useTasks } from '@/hooks/useTasks';
import { TaskStatusBadge } from './TaskStatusBadge';
import { toast } from 'sonner';

interface TaskDependenciesProps {
  taskId: string;
}

export function TaskDependencies({ taskId }: TaskDependenciesProps) {
  const { data, isLoading } = useTaskDependencies(taskId);
  const createDep = useCreateTaskDependency();
  const deleteDep = useDeleteTaskDependency();
  const { data: allTasks = [] } = useTasks({});

  const [isAdding, setIsAdding] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [depType, setDepType] = useState<'blocked_by' | 'blocks' | 'related'>('blocked_by');
  const [search, setSearch] = useState('');

  const blockedBy = data?.blockedBy || [];
  const blocks = data?.blocks || [];
  const hasUncompletedBlockers = blockedBy.some(
    (d) => d.related_task?.status !== 'completed'
  );

  // Filter out current task and already linked tasks
  const linkedIds = new Set([
    taskId,
    ...blockedBy.map((d) => d.depends_on_task_id),
    ...blocks.map((d) => d.task_id),
  ]);
  const availableTasks = allTasks.filter(
    (t) => !linkedIds.has(t.id) && t.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!selectedTaskId) return;
    try {
      await createDep.mutateAsync({ taskId, dependsOnTaskId: selectedTaskId, type: depType });
      setSelectedTaskId('');
      setIsAdding(false);
      setSearch('');
      toast.success('Zależność dodana');
    } catch {
      toast.error('Nie udało się dodać zależności');
    }
  };

  const handleDelete = async (depId: string) => {
    try {
      await deleteDep.mutateAsync({ depId, taskId });
      toast.success('Zależność usunięta');
    } catch {
      toast.error('Nie udało się usunąć zależności');
    }
  };

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground">Zależności</h4>
            {hasUncompletedBlockers && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {hasUncompletedBlockers && (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-2 py-1">
            To zadanie ma niezakończone blokery
          </p>
        )}

        {/* Blocked by */}
        {blockedBy.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Blokowane przez:</p>
            {blockedBy.map((dep) => (
              <div key={dep.id} className="flex items-center gap-2 text-sm p-1.5 rounded-md bg-muted/30">
                <ArrowRight className="h-3 w-3 text-destructive shrink-0" />
                <span className="flex-1 truncate">{dep.related_task?.title}</span>
                <TaskStatusBadge status={dep.related_task?.status || 'pending'} />
                <button onClick={() => handleDelete(dep.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Blocks */}
        {blocks.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Blokuje:</p>
            {blocks.map((dep) => (
              <div key={dep.id} className="flex items-center gap-2 text-sm p-1.5 rounded-md bg-muted/30">
                <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                <span className="flex-1 truncate">{dep.related_task?.title}</span>
                <TaskStatusBadge status={dep.related_task?.status || 'pending'} />
                <button onClick={() => handleDelete(dep.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add dependency */}
        {isAdding && (
          <div className="space-y-2 p-2 border rounded-md">
            <Select value={depType} onValueChange={(v) => setDepType(v as any)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blocked_by">Blokowane przez</SelectItem>
                <SelectItem value="blocks">Blokuje</SelectItem>
                <SelectItem value="related">Powiązane</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Szukaj zadania..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-sm"
            />

            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {availableTasks.slice(0, 10).map((t) => (
                <button
                  key={t.id}
                  className={`w-full text-left text-sm p-1.5 rounded-md hover:bg-muted/50 truncate ${
                    selectedTaskId === t.id ? 'bg-primary/10 text-primary' : ''
                  }`}
                  onClick={() => setSelectedTaskId(t.id)}
                >
                  {t.title}
                </button>
              ))}
              {availableTasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Brak wyników</p>
              )}
            </div>

            <div className="flex gap-1">
              <Button size="sm" className="h-7 flex-1 text-xs" onClick={handleAdd} disabled={!selectedTaskId || createDep.isPending}>
                {createDep.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Dodaj'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setIsAdding(false); setSearch(''); }}>
                Anuluj
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
