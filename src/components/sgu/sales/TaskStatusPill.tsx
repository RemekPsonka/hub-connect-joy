import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle, Clock, Circle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskContactInfo, TaskStatus } from '@/hooks/useActiveTaskContacts';

interface Props {
  info?: TaskContactInfo;
  onClick: () => void;
}

const meta: Record<TaskStatus, { icon: typeof Plus; cls: string; label: string }> = {
  overdue: { icon: AlertCircle, cls: 'bg-destructive/15 text-destructive border-destructive/40 animate-pulse', label: 'Przeterminowane' },
  today:   { icon: Clock,        cls: 'bg-amber-500/15 text-amber-700 border-amber-500/40',                   label: 'Na dziś' },
  active:  { icon: Circle,       cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40',             label: 'Aktywne' },
  done:    { icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-700/70 border-emerald-500/30',          label: 'Wykonane' },
  none:    { icon: Plus,         cls: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',       label: 'Dodaj zadanie' },
};

export function TaskStatusPill({ info, onClick }: Props) {
  const status: TaskStatus = info?.status ?? 'none';
  const m = meta[status];
  const Icon = m.icon;
  const open = (info?.overdueCount ?? 0) + (info?.todayCount ?? 0) + (info?.activeCount ?? 0);
  const count = status === 'none' ? '' : status === 'done' ? `${info?.doneCount ?? 0}✓` : String(open);

  const tooltip = status === 'none'
    ? 'Brak zadań — kliknij, aby dodać'
    : [
        info?.overdueCount ? `${info.overdueCount} przeterminowane` : '',
        info?.todayCount ? `${info.todayCount} na dziś` : '',
        info?.activeCount ? `${info.activeCount} aktywne` : '',
        info?.doneCount ? `${info.doneCount} wykonane` : '',
      ].filter(Boolean).join(' · ');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <Badge variant="outline" className={cn('h-5 px-1.5 gap-1 text-[10px] font-medium border', m.cls)}>
            <Icon className="h-3 w-3" />
            {count && <span>{count}</span>}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip || m.label}</TooltipContent>
    </Tooltip>
  );
}
