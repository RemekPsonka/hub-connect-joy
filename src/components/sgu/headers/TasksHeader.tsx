import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, AlertCircle, CalendarRange, CheckCircle2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useMyTeamAssignments } from '@/hooks/useDealsTeamAssignments';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { bucketOfTask } from '@/lib/sguTaskBuckets';
import { cn } from '@/lib/utils';

type BucketKey = 'mine_clients' | 'today' | 'overdue' | 'upcoming' | 'done_today';

export function TasksHeader() {
  const { director } = useAuth();
  const { sguTeamId } = useSGUTeamId();
  const { data: assignments = [] } = useMyTeamAssignments(sguTeamId ?? undefined);
  const { data: teamContacts = [] } = useTeamContacts(sguTeamId ?? undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeBucket = (searchParams.get('bucket') ?? '') as BucketKey | '';

  const counts = useMemo(() => {
    const mine = assignments.filter(
      (a) => a.assigned_to === director?.id || (!a.assigned_to && a.owner_id === director?.id),
    );
    let today = 0;
    let overdue = 0;
    let upcoming = 0;
    for (const a of mine) {
      const b = bucketOfTask(a);
      if (b === 'today') today += 1;
      else if (b === 'overdue') overdue += 1;
      else if (b === 'upcoming') upcoming += 1;
    }
    const todayStart = startOfDay(new Date()).toISOString();
    const doneToday = mine.filter(
      (a) => a.status === 'completed' && (a.completed_at ?? a.created_at ?? '') >= todayStart,
    ).length;
    const mineClients = teamContacts.filter((tc) => tc.assigned_to === director?.id).length;
    return { mineClients, today, overdue, upcoming, doneToday };
  }, [assignments, teamContacts, director?.id]);

  const items: Array<{ key: BucketKey; label: string; value: number; icon: typeof Users; tone: string }> = [
    { key: 'mine_clients', label: 'Pod opieką', value: counts.mineClients, icon: Users, tone: 'text-amber-600' },
    { key: 'today', label: 'Dziś', value: counts.today, icon: CalendarDays, tone: 'text-emerald-600' },
    { key: 'overdue', label: 'Zaległe', value: counts.overdue, icon: AlertCircle, tone: counts.overdue > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { key: 'upcoming', label: 'Najbliższe 7 dni', value: counts.upcoming, icon: CalendarRange, tone: 'text-sky-600' },
    { key: 'done_today', label: 'Zrobione dziś', value: counts.doneToday, icon: CheckCircle2, tone: 'text-violet-600' },
  ];

  const handleClick = (key: BucketKey) => {
    const params = new URLSearchParams(searchParams);
    if (activeBucket === key) params.delete('bucket');
    else params.set('bucket', key);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it) => {
        const isActive = activeBucket === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => handleClick(it.key)}
            className="text-left focus:outline-none focus:ring-2 focus:ring-ring rounded-md"
          >
            <Card
              className={cn(
                'transition-colors hover:bg-muted/40',
                isActive && 'ring-2 ring-primary',
                it.key === 'overdue' && counts.overdue > 0 && 'border-destructive/50',
              )}
            >
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{it.label}</span>
                  <it.icon className={cn('h-4 w-4', it.tone)} />
                </div>
                <div className="text-2xl font-semibold tabular-nums">{it.value}</div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
