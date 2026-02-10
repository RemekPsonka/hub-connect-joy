import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useDirectors } from '@/hooks/useDirectors';
import { DataCard } from '@/components/ui/data-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CheckSquare, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, isAfter, isBefore, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekujące',
  in_progress: 'W trakcie',
  completed: 'Zakończone',
  cancelled: 'Anulowane',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  urgent: 'Pilny',
};

export default function TaskAnalytics() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;
  const [period, setPeriod] = useState('30');
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const { data: projects } = useProjects();
  const { data: directors } = useDirectors();

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['task-analytics', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, created_at, updated_at, owner_id, assigned_to, project_id')
        .eq('tenant_id', tenantId!)
        .is('parent_task_id', null);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const days = parseInt(period);
  const startDate = startOfDay(subDays(new Date(), days));

  const tasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (projectFilter !== 'all' && t.project_id !== projectFilter) return false;
      if (assigneeFilter !== 'all') {
        const matches = t.assigned_to === assigneeFilter || t.owner_id === assigneeFilter;
        if (!matches) return false;
      }
      return true;
    });
  }, [allTasks, projectFilter, assigneeFilter]);

  // Metrics
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const overdue = tasks.filter(
    (t) => t.due_date && t.status !== 'completed' && isBefore(parseISO(t.due_date), new Date())
  ).length;
  const recentCompleted = tasks.filter(
    (t) => t.status === 'completed' && t.updated_at && isAfter(parseISO(t.updated_at), startDate)
  ).length;

  // Trend data
  const trendData = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      buckets[d] = 0;
    }
    tasks
      .filter((t) => t.status === 'completed' && t.updated_at)
      .forEach((t) => {
        const d = format(parseISO(t.updated_at!), 'yyyy-MM-dd');
        if (buckets[d] !== undefined) buckets[d]++;
      });
    return Object.entries(buckets).map(([date, count]) => ({
      date: format(parseISO(date), 'd MMM', { locale: pl }),
      zakończone: count,
    }));
  }, [tasks, days]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      const s = t.status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      color: STATUS_COLORS[status] || '#94a3b8',
    }));
  }, [tasks]);

  // Priority distribution
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      const p = t.priority || 'medium';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([priority, value]) => ({
      name: PRIORITY_LABELS[priority] || priority,
      value,
      color: PRIORITY_COLORS[priority] || '#94a3b8',
    }));
  }, [tasks]);

  // Team workload
  const workloadData = useMemo(() => {
    const map: Record<string, { total: number; completed: number; name: string }> = {};
    tasks.forEach((t) => {
      const personId = t.assigned_to || t.owner_id;
      if (!personId) return;
      if (!map[personId]) {
        const dir = directors?.find((d) => d.id === personId);
        map[personId] = { total: 0, completed: 0, name: dir?.full_name || 'Nieznany' };
      }
      map[personId].total++;
      if (t.status === 'completed') map[personId].completed++;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [tasks, directors]);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Analityka zadań</h1>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dni</SelectItem>
              <SelectItem value="14">14 dni</SelectItem>
              <SelectItem value="30">30 dni</SelectItem>
              <SelectItem value="90">90 dni</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Projekt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie projekty</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Osoba" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              {directors?.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DataCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Łącznie zadań</p>
            </div>
          </div>
        </DataCard>
        <DataCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{recentCompleted}</p>
              <p className="text-xs text-muted-foreground">Zakończone ({period}d)</p>
            </div>
          </div>
        </DataCard>
        <DataCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completed}</p>
              <p className="text-xs text-muted-foreground">Ogółem zakończone</p>
            </div>
          </div>
        </DataCard>
        <DataCard>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdue}</p>
              <p className="text-xs text-muted-foreground">Zaległe</p>
            </div>
          </div>
        </DataCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trend */}
        <DataCard title="Trend zakończonych zadań" className="md:col-span-2" isLoading={isLoading}>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="zakończone"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        {/* Status pie */}
        <DataCard title="Rozkład statusów" isLoading={isLoading}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        {/* Priority pie */}
        <DataCard title="Rozkład priorytetów" isLoading={isLoading}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        {/* Team workload */}
        <DataCard title="Obciążenie zespołu" className="md:col-span-2" isLoading={isLoading}>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Łącznie" fill="hsl(var(--primary) / 0.6)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="completed" name="Zakończone" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>
    </div>
  );
}
