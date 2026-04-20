import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, AlertCircle, CalendarRange, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSGUTasks } from '@/hooks/useSGUTasks';
import { cn } from '@/lib/utils';

export function TasksHeader() {
  const { user } = useAuth();
  const { data: today = [] } = useSGUTasks('today');
  const { data: overdue = [] } = useSGUTasks('overdue');

  const { data: next7 = 0 } = useQuery({
    queryKey: ['sgu-tasks-next7', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to_user_id', user!.id)
        .neq('status', 'completed')
        .gte('due_date', start.toISOString().slice(0, 10))
        .lte('due_date', end.toISOString().slice(0, 10));
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: doneToday = 0 } = useQuery({
    queryKey: ['sgu-tasks-done-today', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to_user_id', user!.id)
        .eq('status', 'completed')
        .gte('updated_at', start.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const items = [
    { label: 'Dziś', value: today.length, icon: CalendarDays, tone: 'text-emerald-600' },
    { label: 'Zaległe', value: overdue.length, icon: AlertCircle, tone: overdue.length > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Najbliższe 7d', value: next7, icon: CalendarRange, tone: 'text-sky-600' },
    { label: 'Zrobione dziś', value: doneToday, icon: CheckCircle2, tone: 'text-violet-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <Card key={it.label} className={cn(it.label === 'Zaległe' && overdue.length > 0 && 'border-destructive/50')}>
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{it.label}</span>
              <it.icon className={cn('h-4 w-4', it.tone)} />
            </div>
            <div className="text-2xl font-semibold tabular-nums">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
