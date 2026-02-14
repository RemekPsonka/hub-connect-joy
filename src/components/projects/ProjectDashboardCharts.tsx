import { useMemo } from 'react';
import { DataCard } from '@/components/ui/data-card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { format, subDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { TaskWithDetails } from '@/hooks/useTasks';

interface ProjectDashboardChartsProps {
  tasks: TaskWithDetails[];
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'hsl(var(--destructive))',
  high: 'hsl(var(--warning))',
  medium: 'hsl(var(--primary))',
  low: 'hsl(var(--muted-foreground))',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Pilne',
  high: 'Wysoki',
  medium: 'Średni',
  low: 'Niski',
};

const STATUS_COLORS: Record<string, string> = {
  todo: 'hsl(var(--muted-foreground))',
  in_progress: 'hsl(var(--primary))',
  completed: 'hsl(var(--success))',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'Do zrobienia',
  in_progress: 'W toku',
  completed: 'Zakończone',
};

export function ProjectDashboardCharts({ tasks }: ProjectDashboardChartsProps) {
  const today = startOfDay(new Date());

  // Priority distribution
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach((t) => {
      const p = t.priority || 'low';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: PRIORITY_LABELS[key] || key,
        value,
        color: PRIORITY_COLORS[key] || '#888',
      }));
  }, [tasks]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, completed: 0 };
    tasks.forEach((t) => {
      const s = t.status || 'todo';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: STATUS_LABELS[key] || key,
        value,
        color: STATUS_COLORS[key] || '#888',
      }));
  }, [tasks]);

  // Burndown: last 14 days
  const burndownData = useMemo(() => {
    const days: { date: string; remaining: number; completed: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = subDays(today, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const label = format(day, 'd MMM', { locale: pl });

      // Count tasks completed up to this day
      const completedByDay = tasks.filter(
        (t) => t.status === 'completed' && t.updated_at && isBefore(startOfDay(new Date(t.updated_at)), subDays(day, -1))
      ).length;

      days.push({
        date: label,
        remaining: tasks.length - completedByDay,
        completed: completedByDay,
      });
    }
    return days;
  }, [tasks, today]);

  // Overdue tasks
  const overdueTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status !== 'completed' &&
          t.due_date &&
          isBefore(new Date(t.due_date), today)
      ),
    [tasks, today]
  );

  if (tasks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Burndown */}
      <DataCard title="Wykres postępu (14 dni)" className="md:col-span-2">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="remaining"
                name="Pozostałe"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.1)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DataCard>

      {/* Priority pie */}
      <DataCard title="Rozkład priorytetów">
        <div className="h-48 flex items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                paddingAngle={2}
              >
                {priorityData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 pr-2">
            {priorityData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs whitespace-nowrap">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </DataCard>

      {/* Status pie */}
      <DataCard title="Rozkład statusów">
        <div className="h-48 flex items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                paddingAngle={2}
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 pr-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs whitespace-nowrap">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </DataCard>

      {/* Overdue alerts */}
      {overdueTasks.length > 0 && (
        <DataCard title="Zaległe zadania" className="md:col-span-2">
          <div className="space-y-2">
            {overdueTasks.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-1.5">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm truncate flex-1">{t.title}</p>
                <Badge variant="destructive" className="text-xs shrink-0">
                  {t.due_date && format(new Date(t.due_date), 'd MMM', { locale: pl })}
                </Badge>
              </div>
            ))}
            {overdueTasks.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{overdueTasks.length - 5} więcej zaległych zadań
              </p>
            )}
          </div>
        </DataCard>
      )}
    </div>
  );
}
