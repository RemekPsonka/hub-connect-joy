import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Wallet,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Trophy,
  Layers,
} from 'lucide-react';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import type { SGUClientsPortfolio } from '@/hooks/useSGUClientsPortfolio';

interface Props {
  data: SGUClientsPortfolio | undefined;
  isLoading: boolean;
  onCardClick?: (key: string) => void;
}

function trend(curr: number, prev: number): { pct: number; up: boolean } | null {
  if (!prev) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

export function ClientsHeader({ data, isLoading, onCardClick }: Props) {
  const t = data?.totals;
  const portfolioTrend = t ? trend(t.portfolioBookedPln, t.portfolioBookedPlnPrevMonth) : null;
  const commTrend = t ? trend(t.commissionMonthGr, t.commissionPrevMonthGr) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <KpiCard
        icon={<Users className="h-4 w-4" />}
        label="Klienci aktywni"
        value={isLoading ? '—' : String(t?.clientsCount ?? 0)}
        sub={
          t && t.clientsCount > 0
            ? `Avg ${formatCompactCurrency((t.avgPremiumPerClientGr ?? 0) / 100)}`
            : undefined
        }
        onClick={onCardClick ? () => onCardClick('active') : undefined}
      />
      <KpiCard
        icon={<Wallet className="h-4 w-4" />}
        label="Portfel total"
        value={isLoading ? '—' : formatCompactCurrency(t?.portfolioBookedPln ?? 0)}
        sub={
          portfolioTrend
            ? `${portfolioTrend.up ? '+' : '−'}${portfolioTrend.pct}% MoM`
            : undefined
        }
        subIcon={
          portfolioTrend ? (
            portfolioTrend.up ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )
          ) : null
        }
        onClick={onCardClick ? () => onCardClick('portfolio') : undefined}
      />
      <KpiCard
        icon={
          <AlertTriangle
            className={`h-4 w-4 ${t && t.overdueCount > 0 ? 'text-destructive' : ''}`}
          />
        }
        label="Zaległe raty"
        value={isLoading ? '—' : String(t?.overdueCount ?? 0)}
        sub={t && t.overdueCount > 0 ? formatCompactCurrency(t.overdueAmountPln) : 'Brak'}
        alert={!!t && t.overdueCount > 0}
        onClick={onCardClick ? () => onCardClick('overdue') : undefined}
      />
      <KpiCard
        icon={<RefreshCw className="h-4 w-4" />}
        label="Odnowienia 30d"
        value={isLoading ? '—' : String(t?.renewals30dCount ?? 0)}
        sub="polis"
        onClick={onCardClick ? () => onCardClick('renewals') : undefined}
      />
      <KpiCard
        icon={<Wallet className="h-4 w-4" />}
        label="Prowizja miesięczna"
        value={isLoading ? '—' : formatCompactCurrency((t?.commissionMonthGr ?? 0) / 100)}
        sub={commTrend ? `${commTrend.up ? '+' : '−'}${commTrend.pct}% MoM` : undefined}
        subIcon={
          commTrend ? (
            commTrend.up ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )
          ) : null
        }
        onClick={onCardClick ? () => onCardClick('commission') : undefined}
      />
      <KpiCard
        icon={<Trophy className="h-4 w-4 text-emerald-600" />}
        label="Ambasadorzy"
        value={isLoading ? '—' : String(t?.ambassadorsCount ?? 0)}
        sub="🏆 status"
        onClick={onCardClick ? () => onCardClick('ambassadors') : undefined}
      />
      <KpiCard
        icon={<Layers className="h-4 w-4 text-violet-600" />}
        label="Kompleksowi"
        value={isLoading ? '—' : String(t?.complexClientsCount ?? 0)}
        sub="≥3 obszary aktywne"
        onClick={onCardClick ? () => onCardClick('complex') : undefined}
      />
    </div>
  );
}

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  subIcon?: React.ReactNode;
  alert?: boolean;
  onClick?: () => void;
}

function KpiCard({ icon, label, value, sub, subIcon, alert, onClick }: KpiProps) {
  return (
    <Card
      className={`${alert ? 'border-destructive/50' : ''} ${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {sub && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {subIcon}
            <span>{sub}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
