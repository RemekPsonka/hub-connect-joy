import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Coins, Target, Calendar, Percent } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';

interface CommissionsHeaderProps {
  teamId?: string;
}

interface CommAgg {
  monthGr: number;
  prevMonthGr: number;
  ytdGr: number;
}

export function CommissionsHeader({ teamId }: CommissionsHeaderProps) {
  const { data, isLoading } = useQuery<CommAgg>({
    queryKey: ['sgu-commissions-header', teamId],
    staleTime: 60_000,
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

      let q1 = supabase.from('commission_entries').select('amount_gr').gte('created_at', monthStart);
      let q2 = supabase.from('commission_entries').select('amount_gr').gte('created_at', prevStart).lt('created_at', monthStart);
      let q3 = supabase.from('commission_entries').select('amount_gr').gte('created_at', yearStart);
      if (teamId) {
        q1 = q1.eq('team_id', teamId);
        q2 = q2.eq('team_id', teamId);
        q3 = q3.eq('team_id', teamId);
      }
      const [m, p, y] = await Promise.all([q1, q2, q3]);
      if (m.error) throw m.error;
      if (p.error) throw p.error;
      if (y.error) throw y.error;
      const sum = (rs: { amount_gr: number | null }[] | null) =>
        (rs ?? []).reduce((s, r) => s + Number(r.amount_gr ?? 0), 0);
      return { monthGr: sum(m.data), prevMonthGr: sum(p.data), ytdGr: sum(y.data) };
    },
  });

  const month = data?.monthGr ?? 0;
  const prev = data?.prevMonthGr ?? 0;
  const ytd = data?.ytdGr ?? 0;
  const momPct = prev ? Math.round(((month - prev) / prev) * 100) : null;
  const monthsElapsed = new Date().getMonth() + 1;
  const forecastEoy = monthsElapsed > 0 ? Math.round((ytd / monthsElapsed) * 12) : 0;
  // Realization: assume target = forecastEoy as proxy (real target table not yet wired).
  const realizationPct = forecastEoy ? Math.min(100, Math.round((ytd / forecastEoy) * 100)) : 0;

  const items = [
    {
      label: 'MoM',
      value: isLoading ? '—' : (momPct === null ? '—' : `${momPct >= 0 ? '+' : ''}${momPct}%`),
      sub: formatCompactCurrency(month / 100),
      icon: momPct !== null && momPct >= 0 ? TrendingUp : TrendingDown,
      tone: momPct !== null && momPct >= 0 ? 'text-emerald-600' : 'text-destructive',
    },
    { label: 'YTD', value: isLoading ? '—' : formatCompactCurrency(ytd / 100), sub: 'Razem od stycznia', icon: Coins, tone: 'text-sky-600' },
    { label: 'Forecast EoY', value: isLoading ? '—' : formatCompactCurrency(forecastEoy / 100), sub: 'Liniowy ekstrapolat', icon: Calendar, tone: 'text-violet-600' },
    { label: 'Realizacja', value: isLoading ? '—' : `${realizationPct}%`, sub: 'YTD / forecast', icon: Percent, tone: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{it.label}</span>
              <it.icon className={cn('h-4 w-4', it.tone)} />
            </div>
            <div className="text-2xl font-semibold tabular-nums">{it.value}</div>
            <div className="text-[10px] text-muted-foreground">{it.sub}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
