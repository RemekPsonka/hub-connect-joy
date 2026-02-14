import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedTaskRow, STATUS_CONFIG } from './UnifiedTaskRow';
import type { TaskWithDetails } from '@/hooks/useTasks';

interface TasksTeamViewProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onNewTask: () => void;
}

interface MemberBucket {
  id: string | null;
  name: string;
  tasks: TaskWithDetails[];
  done: number;
  notDone: number;
  pct: number;
  byStatus: Record<string, TaskWithDetails[]>;
}

const STATUS_ORDER = ['todo', 'in_progress', 'completed', 'cancelled'] as const;

export function TasksTeamView({ tasks, onTaskClick, onStatusChange, onNewTask }: TasksTeamViewProps) {
  const buckets = useMemo(() => {
    const map = new Map<string, MemberBucket>();

    // Group by assigned_to
    for (const task of tasks) {
      const assignee = (task as any).assignee;
      const key = task.assigned_to || '__unassigned__';
      const name = assignee?.full_name || 'Nieprzypisane';

      if (!map.has(key)) {
        map.set(key, {
          id: task.assigned_to || null,
          name,
          tasks: [],
          done: 0,
          notDone: 0,
          pct: 0,
          byStatus: {},
        });
      }

      const bucket = map.get(key)!;
      bucket.tasks.push(task);

      const status = task.status === 'pending' ? 'todo' : (task.status || 'todo');
      if (!bucket.byStatus[status]) bucket.byStatus[status] = [];
      bucket.byStatus[status].push(task);

      if (status === 'completed') {
        bucket.done++;
      } else if (status !== 'cancelled') {
        bucket.notDone++;
      }
    }

    // Calculate percentages
    for (const b of map.values()) {
      const total = b.done + b.notDone;
      b.pct = total > 0 ? Math.round((b.done / total) * 100) : 0;
    }

    // Sort: unassigned first, then by most tasks
    return Array.from(map.values()).sort((a, b) => {
      if (a.id === null) return -1;
      if (b.id === null) return 1;
      return b.tasks.length - a.tasks.length;
    });
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {buckets.map((bucket) => (
        <MemberCard
          key={bucket.id || 'unassigned'}
          bucket={bucket}
          onTaskClick={onTaskClick}
          onStatusChange={onStatusChange}
          onNewTask={onNewTask}
        />
      ))}
    </div>
  );
}

function MemberCard({
  bucket,
  onTaskClick,
  onStatusChange,
  onNewTask,
}: {
  bucket: MemberBucket;
  onTaskClick: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onNewTask: () => void;
}) {
  const initials = bucket.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-2 space-y-2">
        {/* Header: avatar + name + add button */}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className={cn(
              'text-xs font-medium',
              bucket.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {bucket.id ? initials : <User className="h-3.5 w-3.5" />}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm flex-1 truncate">{bucket.name}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onNewTask}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-foreground">{bucket.notDone}</span>
            <span className="text-muted-foreground">do zrob.</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-green-600">{bucket.done}</span>
            <span className="text-muted-foreground">gotowe</span>
          </div>
          <div className="flex-1" />
          <span className="text-muted-foreground font-medium">{bucket.pct}%</span>
        </div>

        {/* Progress bar */}
        <Progress value={bucket.pct} className="h-1.5" />
      </CardHeader>

      <CardContent className="pt-0 pb-2 flex-1">
        {/* Status groups */}
        {STATUS_ORDER.map((statusKey) => {
          const statusTasks = bucket.byStatus[statusKey];
          if (!statusTasks || statusTasks.length === 0) return null;
          const st = STATUS_CONFIG[statusKey];
          const StIcon = st.icon;

          return (
            <StatusGroup
              key={statusKey}
              label={st.label}
              icon={<StIcon className={cn('h-3.5 w-3.5', st.color)} />}
              count={statusTasks.length}
              tasks={statusTasks}
              onTaskClick={onTaskClick}
              onStatusChange={onStatusChange}
              defaultOpen={statusKey !== 'completed' && statusKey !== 'cancelled'}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function StatusGroup({
  label,
  icon,
  count,
  tasks,
  onTaskClick,
  onStatusChange,
  defaultOpen,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
  onStatusChange: (taskId: string, status: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-1">
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full py-1.5 px-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50">
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
        {icon}
        <span>{label}</span>
        <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-1 border-l border-border/50">
          {tasks.map((task) => (
            <UnifiedTaskRow
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onClick={(id) => {
                const t = tasks.find((tt) => tt.id === id);
                if (t) onTaskClick(t);
              }}
              compact
              showSubtasks
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
