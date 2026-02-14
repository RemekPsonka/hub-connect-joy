import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useTasks } from '@/hooks/useTasks';
import { useDirectors } from '@/hooks/useDirectors';
import { Download, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const COLORS = ['hsl(263,70%,50%)', 'hsl(200,70%,50%)', 'hsl(150,70%,50%)', 'hsl(30,70%,50%)', 'hsl(350,70%,50%)', 'hsl(50,70%,50%)'];

export default function TeamProductivityReport() {
  const { data: allTasks = [] } = useTasks({});
  const { data: directors = [] } = useDirectors();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const filteredTasks = useMemo(() => {
    if (period === 'all') return allTasks;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    return allTasks.filter((t) => new Date(t.created_at!) >= since);
  }, [allTasks, period]);

  // Tasks per person
  const tasksByDirector = useMemo(() => {
    const map = new Map<string, { name: string; total: number; completed: number; overdue: number }>();
    directors.forEach((d) => map.set(d.id, { name: d.full_name, total: 0, completed: 0, overdue: 0 }));

    filteredTasks.forEach((t) => {
      const ownerId = t.owner_id || t.assigned_to;
      if (ownerId && map.has(ownerId)) {
        const entry = map.get(ownerId)!;
        entry.total++;
        if (t.status === 'completed') entry.completed++;
        if (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed') entry.overdue++;
      }
    });

    return Array.from(map.values()).filter((e) => e.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredTasks, directors]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, completed: 0 };
    filteredTasks.forEach((t) => { counts[t.status || 'todo']++; });
    return [
      { name: 'Do zrobienia', value: counts.todo },
      { name: 'W trakcie', value: counts.in_progress },
      { name: 'Zakończone', value: counts.completed },
    ];
  }, [filteredTasks]);

  const totalCompleted = filteredTasks.filter((t) => t.status === 'completed').length;
  const totalOverdue = filteredTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length;

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      tasksByDirector.map((d) => ({
        Osoba: d.name,
        'Łącznie zadań': d.total,
        Zakończone: d.completed,
        'Overdue': d.overdue,
        'Completion Rate': d.total > 0 ? `${Math.round((d.completed / d.total) * 100)}%` : '0%',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produktywność');
    XLSX.writeFile(wb, 'produktywnosc-zespolu.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Raport produktywności zespołu</h1>
          <p className="text-muted-foreground">Analiza obciążenia i efektywności</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dni</SelectItem>
              <SelectItem value="30d">30 dni</SelectItem>
              <SelectItem value="90d">90 dni</SelectItem>
              <SelectItem value="all">Wszystko</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Eksport XLSX
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{filteredTasks.length}</p>
              <p className="text-xs text-muted-foreground">Łącznie zadań</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Zakończone</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{totalOverdue}</p>
              <p className="text-xs text-muted-foreground">Po terminie</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">
                {filteredTasks.length > 0 ? Math.round((totalCompleted / filteredTasks.length) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Tasks per person */}
        <Card>
          <CardHeader><CardTitle className="text-base">Zadania per osoba</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tasksByDirector} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="completed" name="Zakończone" fill="hsl(150,70%,45%)" stackId="a" />
                <Bar dataKey="overdue" name="Po terminie" fill="hsl(0,70%,55%)" stackId="a" />
                <Bar dataKey="total" name="Łącznie" fill="hsl(263,70%,50%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader><CardTitle className="text-base">Rozkład statusów</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
