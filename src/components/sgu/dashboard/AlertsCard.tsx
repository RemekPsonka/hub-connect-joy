import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarX,
  Sparkles,
  UserCheck,
  UserX,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDashboardAlerts } from '@/hooks/sgu-dashboard/useDashboardAlerts';

interface AlertRowProps {
  label: string;
  icon: LucideIcon;
  count: number | undefined;
  loading: boolean;
  navigateTo: string;
  severity?: 'warn' | 'destructive';
}

function AlertRow({
  label,
  icon: Icon,
  count,
  loading,
  navigateTo,
  severity = 'warn',
}: AlertRowProps) {
  const navigate = useNavigate();
  const isZero = (count ?? 0) === 0;

  return (
    <button
      type="button"
      onClick={() => !isZero && navigate(navigateTo)}
      disabled={isZero}
      className={cn(
        'group flex items-center gap-3 w-full rounded-lg border bg-card px-3 py-2.5 text-left transition-colors',
        isZero
          ? 'opacity-60 cursor-default'
          : 'hover:bg-muted/50 hover:border-primary/40'
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          isZero
            ? 'text-muted-foreground'
            : severity === 'destructive'
              ? 'text-destructive'
              : 'text-warning'
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
      </div>
      {loading ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <Badge
          variant={
            isZero
              ? 'secondary'
              : severity === 'destructive'
                ? 'destructive'
                : 'default'
          }
          className="tabular-nums"
        >
          {count ?? 0}
        </Badge>
      )}
      {!isZero && (
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
      )}
    </button>
  );
}

export function AlertsCard() {
  const { data, isLoading } = useDashboardAlerts();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          Alerty
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <AlertRow
          label="Polisy wygasające < 14 dni"
          icon={CalendarX}
          count={data?.a1}
          loading={isLoading}
          navigateTo="/sgu/klienci?tab=renewals&filter=lt14"
          severity="warn"
        />
        <AlertRow
          label="Raty zaległe 30+ dni"
          icon={Wallet}
          count={data?.a2}
          loading={isLoading}
          navigateTo="/sgu/klienci?tab=payments&filter=overdue30"
          severity="destructive"
        />
        <AlertRow
          label="Klienci bez kontaktu 30+ dni"
          icon={UserX}
          count={data?.a3}
          loading={isLoading}
          navigateTo="/sgu/klienci?tab=portfolio&filter=stale"
          severity="warn"
        />
        <AlertRow
          label="Nowe prospekty z AI KRS (7d)"
          icon={Sparkles}
          count={data?.a4}
          loading={isLoading}
          navigateTo="/sgu/sprzedaz?filter=prospect&source=ai_krs"
          severity="warn"
        />
        <AlertRow
          label="Kandydaci na Ambasadora"
          icon={UserCheck}
          count={data?.a5}
          loading={isLoading}
          navigateTo="/sgu/klienci?tab=renewals&filter=near_ambassador"
          severity="warn"
        />
      </CardContent>
    </Card>
  );
}
