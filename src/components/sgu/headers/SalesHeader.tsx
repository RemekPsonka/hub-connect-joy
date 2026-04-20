import { Card, CardContent } from '@/components/ui/card';
import { Users, Flame, Briefcase, CalendarCheck, AlertTriangle } from 'lucide-react';
import { useTeamContacts } from '@/hooks/useDealsTeamContacts';
import { useSGUTasks } from '@/hooks/useSGUTasks';
import { cn } from '@/lib/utils';
import { deriveStage } from '@/components/sgu/sales/UnifiedKanban';

interface SalesHeaderProps {
  teamId: string;
  onCardClick?: (key: 'prospect' | 'lead' | 'offering' | 'today' | 'overdue') => void;
  activeKey?: 'prospect' | 'lead' | 'offering' | 'today' | 'overdue' | null;
}

export function SalesHeader({ teamId, onCardClick, activeKey }: SalesHeaderProps) {
  const { data: contacts = [] } = useTeamContacts(teamId);
  const { data: today = [] } = useSGUTasks('today');
  const { data: overdue = [] } = useSGUTasks('overdue');

  const visibleContacts = contacts.filter((c) => !c.is_lost);
  const counts = {
    prospect: visibleContacts.filter((c) => deriveStage(c) === 'prospect').length,
    lead: visibleContacts.filter((c) => deriveStage(c) === 'lead').length,
    offering: visibleContacts.filter((c) => deriveStage(c) === 'offering').length,
    today: today.length,
    overdue: overdue.length,
  };

  const items = [
    { key: 'prospect', label: 'Prospekci', value: counts.prospect, icon: Users, tone: 'text-sky-600' },
    { key: 'lead', label: 'Leady', value: counts.lead, icon: Flame, tone: 'text-amber-600' },
    { key: 'offering', label: 'Ofertowanie', value: counts.offering, icon: Briefcase, tone: 'text-violet-600' },
    { key: 'today', label: 'Dziś', value: counts.today, icon: CalendarCheck, tone: 'text-emerald-600' },
    { key: 'overdue', label: 'Zaległe', value: counts.overdue, icon: AlertTriangle, tone: counts.overdue > 0 ? 'text-destructive' : 'text-muted-foreground' },
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it) => (
        <Card
          key={it.key}
          onClick={() => onCardClick?.(it.key)}
          className={cn(
            'cursor-pointer transition-shadow hover:shadow-md',
            it.key === 'overdue' && counts.overdue > 0 && 'border-destructive/50',
            activeKey === it.key && 'ring-2 ring-primary',
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
      ))}
    </div>
  );
}
