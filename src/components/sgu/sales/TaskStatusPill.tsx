import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Phone, FileText, Send, Circle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskContactInfo, TaskStatus, TaskType } from '@/hooks/useActiveTaskContacts';

interface Props {
  info?: TaskContactInfo;
  onClick: () => void;
}

const TYPE_META: Record<TaskType, { icon: typeof Plus; label: string }> = {
  meeting: { icon: Calendar,  label: 'Spotkania' },
  call:    { icon: Phone,     label: 'Telefony' },
  offer:   { icon: FileText,  label: 'Oferty' },
  email:   { icon: Send,      label: 'Maile' },
  other:   { icon: Circle,    label: 'Inne' },
};

const STATUS_CLS: Record<TaskStatus, string> = {
  overdue: 'bg-destructive/15 text-destructive border-destructive/40 animate-pulse',
  today:   'bg-amber-500/15 text-amber-700 border-amber-500/40',
  active:  'bg-emerald-500/15 text-emerald-700 border-emerald-500/40',
  done:    'bg-emerald-500/10 text-emerald-700/70 border-emerald-500/30',
  none:    'bg-muted text-muted-foreground border-border',
};

const ORDER: TaskType[] = ['meeting', 'call', 'offer', 'email', 'other'];

export function TaskStatusPill({ info, onClick }: Props) {
  const handle = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  const visible = ORDER
    .map((k) => ({ k, t: info?.byType?.[k] }))
    .filter((x) => x.t && (x.t.open > 0 || x.t.done > 0));

  if (visible.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => { handle(e); onClick(); }}
            onPointerDown={handle}
            className={cn(
              'inline-flex items-center gap-1 h-5 px-1.5 rounded-full border text-[10px] font-medium shrink-0 whitespace-nowrap',
              STATUS_CLS.none,
              'hover:bg-muted/80 transition',
            )}
          >
            <Plus className="h-3 w-3" />
            <span>Dodaj</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Brak zadań — kliknij, aby dodać</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      {visible.map(({ k, t }) => {
        const meta = TYPE_META[k];
        const Icon = meta.icon;
        const tt = t!;
        const display = tt.open > 0 ? String(tt.open) : `${tt.done}✓`;
        const tip = `${meta.label}: ${tt.open} otwarte` +
          (tt.overdue ? `, ${tt.overdue} przeterm.` : '') +
          (tt.today ? `, ${tt.today} dziś` : '') +
          (tt.done ? ` · ${tt.done} wykonane` : '');
        return (
          <Tooltip key={k}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => { handle(e); onClick(); }}
                onPointerDown={handle}
                className={cn(
                  'inline-flex items-center gap-1 h-5 px-1.5 rounded-full border text-[10px] font-semibold shrink-0 whitespace-nowrap',
                  STATUS_CLS[tt.status],
                  'transition',
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{display}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{tip}</TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
