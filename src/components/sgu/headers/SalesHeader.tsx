import { Card, CardContent } from '@/components/ui/card';
import { Users, Flame, Briefcase, Moon, Star } from 'lucide-react';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { cn } from '@/lib/utils';
import { deriveStage } from '@/components/sgu/sales/UnifiedKanban';

interface SalesHeaderProps {
  teamId: string;
  onCardClick?: (key: 'prospect' | 'lead' | 'offering' | 'client' | 'snoozed') => void;
  activeKey?: 'prospect' | 'lead' | 'offering' | 'client' | 'snoozed' | null;
}

export function SalesHeader({ teamId, onCardClick, activeKey }: SalesHeaderProps) {
  const { data: contacts = [] } = useTeamContacts(teamId);

  const nowIso = new Date().toISOString();
  const visibleContacts = contacts.filter(
    (c) => !c.is_lost && (!c.snoozed_until || c.snoozed_until < nowIso),
  );
  const snoozedContacts = contacts.filter(
    (c) => !c.is_lost && c.snoozed_until && c.snoozed_until >= nowIso,
  );

  const tempBreakdown = (stage: 'prospect' | 'lead' | 'offering') => {
    const list = visibleContacts.filter((c) => deriveStage(c) === stage);
    return {
      total: list.length,
      hot: list.filter((c) => c.temperature === 'hot').length,
      top: list.filter((c) => c.temperature === 'top').length,
      tenx: list.filter((c) => c.temperature === '10x').length,
      cold: list.filter((c) => c.temperature === 'cold').length,
    };
  };

  const prospectStats = tempBreakdown('prospect');
  const leadStats = tempBreakdown('lead');
  const offeringStats = tempBreakdown('offering');

  const counts = {
    prospect: prospectStats.total,
    lead: leadStats.total,
    offering: offeringStats.total,
    snoozed: snoozedContacts.length,
  };

  const breakdownByKey: Record<string, ReturnType<typeof tempBreakdown> | null> = {
    prospect: prospectStats,
    lead: leadStats,
    offering: offeringStats,
    snoozed: null,
  };

  const items = [
    { key: 'prospect', label: 'Prospekci', value: counts.prospect, icon: Users, tone: 'text-sky-600' },
    { key: 'lead', label: 'Leady', value: counts.lead, icon: Flame, tone: 'text-amber-600' },
    { key: 'offering', label: 'Ofertowanie', value: counts.offering, icon: Briefcase, tone: 'text-violet-600' },
    { key: 'snoozed', label: 'Odłożone', value: counts.snoozed, icon: Moon, tone: 'text-indigo-600' },
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <Card
          key={it.key}
          onClick={() => onCardClick?.(it.key)}
          className={cn(
            'cursor-pointer transition-shadow hover:shadow-md',
            activeKey === it.key && 'ring-2 ring-primary',
          )}
        >
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{it.label}</span>
              <it.icon className={cn('h-4 w-4', it.tone)} />
            </div>
            <div className="text-2xl font-semibold tabular-nums">{it.value}</div>
            {breakdownByKey[it.key] && (
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-semibold bg-red-500/15 text-red-700 dark:text-red-300 tabular-nums">
                  HOT {breakdownByKey[it.key]!.hot}
                </span>
                <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-semibold bg-violet-500/15 text-violet-700 dark:text-violet-300 tabular-nums">
                  TOP {breakdownByKey[it.key]!.top}
                </span>
                <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 tabular-nums">
                  10x {breakdownByKey[it.key]!.tenx}
                </span>
                <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-semibold bg-slate-500/15 text-slate-700 dark:text-slate-300 tabular-nums">
                  COLD {breakdownByKey[it.key]!.cold}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
