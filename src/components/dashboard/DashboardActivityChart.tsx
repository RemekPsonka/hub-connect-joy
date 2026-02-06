import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export function DashboardActivityChart() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  const { data: chartData } = useQuery({
    queryKey: ['dashboard-activity-7d', tenantId],
    queryFn: async () => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return format(d, 'yyyy-MM-dd');
      });

      const [contactsRes, tasksRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('created_at')
          .eq('tenant_id', tenantId!)
          .gte('created_at', days[0]),
        supabase
          .from('tasks')
          .select('created_at')
          .eq('tenant_id', tenantId!)
          .gte('created_at', days[0]),
      ]);

      return days.map((day) => ({
        day: format(new Date(day), 'EEE', { locale: pl }),
        kontakty:
          contactsRes.data?.filter((c) => c.created_at?.startsWith(day))
            .length || 0,
        zadania:
          tasksRes.data?.filter((t) => t.created_at?.startsWith(day)).length ||
          0,
      }));
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  if (!chartData) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          width={30}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '0.5rem',
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            fontSize: '0.75rem',
          }}
        />
        <Line
          type="monotone"
          dataKey="kontakty"
          name="Kontakty"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="zadania"
          name="Zadania"
          stroke="hsl(var(--emerald-500, 160 84% 39%))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default DashboardActivityChart;
