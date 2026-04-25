import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Flame, Briefcase, Moon } from 'lucide-react';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { cn } from '@/lib/utils';
import { deriveStage } from '@/components/sgu/sales/UnifiedKanban';
import {
  PROSPECT_SOURCE_LABELS,
  OFFERING_STAGE_LABELS,
  CLIENT_STATUS_LABELS,
  TEMPERATURE_LABELS,
  type DealTeamContact,
} from '@/types/dealTeam';

interface SalesHeaderProps {
  teamId: string;
  onCardClick?: (key: 'prospect' | 'lead' | 'offering' | 'client' | 'snoozed') => void;
  activeKey?: 'prospect' | 'lead' | 'offering' | 'client' | 'snoozed' | null;
}

type BadgeItem = { key: string; short: string; full: string; count: number; className: string };

const PROSPECT_SOURCE_BADGES: Array<{ key: keyof typeof PROSPECT_SOURCE_LABELS; short: string; className: string }> = [
  { key: 'crm_push', short: 'CRM', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { key: 'cc_meeting', short: 'CC', className: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { key: 'ai_krs', short: 'KRS', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { key: 'ai_web', short: 'WWW', className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' },
  { key: 'csv', short: 'CSV', className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
  { key: 'manual', short: 'MAN', className: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300' },
];

const TEMPERATURE_BADGES = [
  { key: 'hot', short: 'HOT', className: 'bg-red-500/15 text-red-700 dark:text-red-300' },
  { key: 'top', short: 'TOP', className: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { key: '10x', short: '10x', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { key: 'cold', short: 'COLD', className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
] as const;

const OFFERING_STAGE_BADGES = [
  { key: 'decision_meeting', short: 'DEC', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  { key: 'handshake', short: 'HAND', className: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { key: 'power_of_attorney', short: 'PEŁ', className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
  { key: 'audit', short: 'AUD', className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' },
  { key: 'offer_sent', short: 'OF', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { key: 'negotiation', short: 'NEG', className: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  { key: 'won', short: 'WON', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { key: 'lost', short: 'LOST', className: 'bg-red-500/15 text-red-700 dark:text-red-300' },
] as const;

const CLIENT_STATUS_BADGES = [
  { key: 'ambassador', short: 'AMB', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { key: 'standard', short: 'STD', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { key: 'lost', short: 'UTR', className: 'bg-red-500/15 text-red-700 dark:text-red-300' },
] as const;

function buildBadges(
  list: DealTeamContact[],
  field: keyof DealTeamContact,
  config: ReadonlyArray<{ key: string; short: string; className: string }>,
  labels: Record<string, string> | Partial<Record<string, string>>,
): BadgeItem[] {
  return config
    .map((c) => ({
      key: c.key,
      short: c.short,
      full: labels[c.key] ?? c.short,
      count: list.filter((x) => (x[field] as unknown as string) === c.key).length,
      className: c.className,
    }))
    .filter((b) => b.count > 0);
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

  const prospectList = visibleContacts.filter((c) => deriveStage(c) === 'prospect');
  const leadList = visibleContacts.filter((c) => deriveStage(c) === 'lead');
  const offeringList = visibleContacts.filter((c) => deriveStage(c) === 'offering');
  const clientList = visibleContacts.filter((c) => deriveStage(c) === 'client');

  const badgesByKey: Record<string, BadgeItem[]> = {
    prospect: buildBadges(prospectList, 'prospect_source', PROSPECT_SOURCE_BADGES, PROSPECT_SOURCE_LABELS),
    lead: buildBadges(leadList, 'temperature', TEMPERATURE_BADGES, TEMPERATURE_LABELS),
    offering: buildBadges(offeringList, 'offering_stage', OFFERING_STAGE_BADGES, OFFERING_STAGE_LABELS as Record<string, string>),
    client: buildBadges(clientList, 'client_status', CLIENT_STATUS_BADGES, CLIENT_STATUS_LABELS),
    snoozed: [],
  };

  const items = [
    { key: 'prospect', label: 'Prospekci', value: prospectList.length, icon: Users, tone: 'text-sky-600' },
    { key: 'lead', label: 'Leady', value: leadList.length, icon: Flame, tone: 'text-amber-600' },
    { key: 'offering', label: 'Ofertowanie', value: offeringList.length, icon: Briefcase, tone: 'text-violet-600' },
    // CLEANUP-BUGS-01 #24: KPI "Klienci" usunięte z SalesHeader — klienci
    // są w osobnym module /sgu/klienci (po AUDIT-FIX-01 useTeamContacts
    // filtruje category='client', więc clientList było zawsze puste).
    { key: 'snoozed', label: 'Odłożone', value: snoozedContacts.length, icon: Moon, tone: 'text-indigo-600' },
  ] as const;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {items.map((it) => {
          const badges = badgesByKey[it.key];
          return (
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
                {badges && badges.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {badges.map((b) => (
                      <Tooltip key={b.key}>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'inline-flex items-center rounded px-1 py-0 text-[10px] font-semibold tabular-nums',
                              b.className,
                            )}
                          >
                            {b.short} {b.count}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {b.full}: {b.count}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
                {it.key === 'prospect' && it.value === 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-[10px] text-muted-foreground italic pt-0.5 cursor-help">
                        Brak prospektów — zaimportuj z KRS / CSV / CC
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs max-w-[260px]">
                      Prospekt = świeży, niezakwalifikowany kontakt (źródło: CRM push, spotkanie CC, AI KRS, AI WWW, CSV, ręczny). Aktualnie wszystkie kontakty są już zakwalifikowane jako Lead lub wyżej.
                    </TooltipContent>
                  </Tooltip>
                )}
                {badges && badges.length === 0 && it.value > 0 && it.key !== 'snoozed' && it.key !== 'prospect' && (
                  <div className="text-[10px] text-muted-foreground italic pt-0.5">
                    Brak rozbicia (puste pole)
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
