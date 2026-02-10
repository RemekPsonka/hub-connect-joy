import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { format, differenceInDays, startOfDay, addDays, max, min } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { TaskWithDetails } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface TaskTimelineProps {
  tasks: TaskWithDetails[];
  onTaskClick: (task: TaskWithDetails) => void;
  projectStartDate?: string | null;
  projectDueDate?: string | null;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-primary',
  low: 'bg-muted-foreground',
};

const statusOpacity: Record<string, string> = {
  completed: 'opacity-50',
  in_progress: 'opacity-100',
  pending: 'opacity-80',
};

export function TaskTimeline({ tasks, onTaskClick, projectStartDate, projectDueDate }: TaskTimelineProps) {
  const { timelineTasks, timelineStart, timelineEnd, totalDays, monthHeaders } = useMemo(() => {
    const tasksWithDates = tasks.filter((t) => t.due_date);
    if (tasksWithDates.length === 0) {
      const now = startOfDay(new Date());
      return { timelineTasks: [], timelineStart: now, timelineEnd: addDays(now, 30), totalDays: 30, monthHeaders: [] };
    }

    const dates = tasksWithDates.map((t) => new Date(t.due_date!));
    if (projectStartDate) dates.push(new Date(projectStartDate));
    if (projectDueDate) dates.push(new Date(projectDueDate));
    dates.push(new Date());

    const earliest = startOfDay(min(dates));
    const latest = startOfDay(max(dates));
    const start = addDays(earliest, -3);
    const end = addDays(latest, 7);
    const days = Math.max(differenceInDays(end, start), 14);

    // Generate month headers
    const headers: { label: string; left: number; width: number }[] = [];
    let d = start;
    while (d <= end) {
      const monthStart = d;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthEnd = nextMonth > end ? end : addDays(nextMonth, -1);
      const left = (differenceInDays(monthStart, start) / days) * 100;
      const width = ((differenceInDays(monthEnd, monthStart) + 1) / days) * 100;
      headers.push({ label: format(monthStart, 'LLL yyyy', { locale: pl }), left, width });
      d = nextMonth;
    }

    return { timelineTasks: tasksWithDates, timelineStart: start, timelineEnd: end, totalDays: days, monthHeaders: headers };
  }, [tasks, projectStartDate, projectDueDate]);

  if (timelineTasks.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Brak zadań z terminem do wyświetlenia na osi czasu.
      </Card>
    );
  }

  const todayOffset = (differenceInDays(startOfDay(new Date()), timelineStart) / totalDays) * 100;

  return (
    <Card className="p-4 overflow-x-auto">
      {/* Month headers */}
      <div className="relative h-8 mb-2 border-b">
        {monthHeaders.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 text-xs font-medium text-muted-foreground capitalize px-1 border-l border-border"
            style={{ left: `${m.left}%`, width: `${m.width}%` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Today line */}
      {todayOffset >= 0 && todayOffset <= 100 && (
        <div
          className="absolute top-0 bottom-0 w-px bg-primary/50 z-10"
          style={{ left: `${todayOffset}%` }}
        />
      )}

      {/* Tasks */}
      <div className="relative space-y-1.5 min-w-[600px]">
        {timelineTasks.map((task) => {
          const taskDate = startOfDay(new Date(task.due_date!));
          const offset = (differenceInDays(taskDate, timelineStart) / totalDays) * 100;
          const barWidth = Math.max(3, (3 / totalDays) * 100); // min 3 days width

          return (
            <div key={task.id} className="relative h-8 flex items-center">
              {/* Task label */}
              <div
                className="absolute text-xs truncate pr-2 text-right"
                style={{ right: `${100 - Math.max(offset - 0.5, 0)}%`, maxWidth: '200px' }}
              >
                <span className={cn('font-medium', task.status === 'completed' && 'line-through text-muted-foreground')}>
                  {task.title}
                </span>
              </div>

              {/* Task bar */}
              <div
                className={cn(
                  'absolute h-5 rounded-full cursor-pointer transition-all hover:scale-y-125',
                  priorityColors[task.priority || 'medium'],
                  statusOpacity[task.status || 'pending'],
                  task.status === 'completed' && 'bg-muted-foreground'
                )}
                style={{
                  left: `${offset}%`,
                  width: `${barWidth}%`,
                  minWidth: '8px',
                }}
                onClick={() => onTaskClick(task)}
                title={`${task.title} — ${format(taskDate, 'd MMM yyyy', { locale: pl })}`}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
