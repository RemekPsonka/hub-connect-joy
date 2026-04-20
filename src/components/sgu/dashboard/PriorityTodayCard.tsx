import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Snowflake,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePriorityTaskToday } from '@/hooks/sgu-dashboard/usePriorityTaskToday';
import { usePriorityStuckNegotiation } from '@/hooks/sgu-dashboard/usePriorityStuckNegotiation';
import { usePriorityOverduePayment } from '@/hooks/sgu-dashboard/usePriorityOverduePayment';
import { usePriorityColdTopLead } from '@/hooks/sgu-dashboard/usePriorityColdTopLead';
import { usePriorityCrossSell } from '@/hooks/sgu-dashboard/usePriorityCrossSell';
import type { DashboardPriorityItem } from '@/types/sgu-dashboard';

interface PriorityRowProps {
  rank: number;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  item: DashboardPriorityItem | null | undefined;
  loading: boolean;
}

function PriorityRow({
  rank,
  label,
  icon: Icon,
  iconClass,
  item,
  loading,
}: PriorityRowProps) {
  const navigate = useNavigate();
  const disabled = !item;

  return (
    <button
      type="button"
      onClick={() => item && navigate(item.navigateTo)}
      disabled={disabled}
      className={cn(
        'group flex items-center gap-3 w-full rounded-lg border bg-card px-3 py-2.5 text-left transition-colors',
        disabled
          ? 'opacity-60 cursor-default'
          : 'hover:bg-muted/50 hover:border-primary/40'
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
        P{rank}
      </span>
      <Icon className={cn('h-4 w-4 shrink-0', iconClass)} />
      <div className="flex-1 min-w-0">
        {loading ? (
          <Skeleton className="h-4 w-3/4" />
        ) : item ? (
          <>
            <div className="text-sm font-medium truncate">{item.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {item.meta}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium text-muted-foreground">
              {label}
            </div>
            <div className="text-xs text-muted-foreground">Brak priorytetu</div>
          </>
        )}
      </div>
      {item && (
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
      )}
    </button>
  );
}

export function PriorityTodayCard() {
  const p1 = usePriorityTaskToday();
  const p2 = usePriorityStuckNegotiation();
  const p3 = usePriorityOverduePayment();
  const p4 = usePriorityColdTopLead();
  const p5 = usePriorityCrossSell();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Priorytety na dziś</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <PriorityRow
          rank={1}
          label="Pilne zadanie na dziś"
          icon={CalendarClock}
          iconClass="text-destructive"
          item={p1.data ?? null}
          loading={p1.isLoading}
        />
        <PriorityRow
          rank={2}
          label="Negocjacje utknęły"
          icon={AlertTriangle}
          iconClass="text-amber-600 dark:text-amber-400"
          item={p2.data ?? null}
          loading={p2.isLoading}
        />
        <PriorityRow
          rank={3}
          label="Zaległa rata"
          icon={Wallet}
          iconClass="text-destructive"
          item={p3.data ?? null}
          loading={p3.isLoading}
        />
        <PriorityRow
          rank={4}
          label="Wystygły TOP lead"
          icon={Snowflake}
          iconClass="text-sky-600 dark:text-sky-400"
          item={p4.data ?? null}
          loading={p4.isLoading}
        />
        <PriorityRow
          rank={5}
          label="Cross-sell — brak obszaru"
          icon={Sparkles}
          iconClass="text-violet-600 dark:text-violet-400"
          item={p5.data ?? null}
          loading={p5.isLoading}
        />
      </CardContent>
    </Card>
  );
}
