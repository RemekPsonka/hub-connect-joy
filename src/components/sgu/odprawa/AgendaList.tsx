import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PriorityBadge } from './PriorityBadge';
import { ListChecks } from 'lucide-react';
import type { OdprawaAgendaRow } from '@/hooks/useOdprawaAgenda';

interface Props {
  rows: OdprawaAgendaRow[] | undefined;
  isLoading: boolean;
  onSelect?: (row: OdprawaAgendaRow) => void;
  currentContactId?: string | null;
  discussedContactIds?: Set<string>;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AgendaList({
  rows,
  isLoading,
  onSelect,
  currentContactId = null,
  discussedContactIds,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Brak kontaktów do omówienia. Wszystko pod kontrolą.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        (() => {
          const isCurrent = currentContactId === row.contact_id;
          const isDiscussed =
            !isCurrent && !!discussedContactIds?.has(row.contact_id);
          const containerCls = [
            'w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isCurrent
              ? 'border-primary bg-primary/5'
              : isDiscussed
              ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 opacity-70'
              : 'border-border hover:bg-muted/50',
          ].join(' ');
          const markerCls = [
            'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
            isCurrent
              ? 'bg-primary text-primary-foreground'
              : isDiscussed
              ? 'bg-emerald-500 text-white'
              : 'bg-muted text-muted-foreground',
          ].join(' ');
          return (
            <button
              key={row.contact_id}
              type="button"
              onClick={() => onSelect?.(row)}
              className={containerCls}
            >
              <span className={markerCls} aria-hidden>
                {isCurrent ? '▶' : isDiscussed ? '✓' : '·'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {row.contact_name || row.company_name || '(bez nazwy)'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {row.company_name && row.company_name !== row.contact_name
                    ? `${row.company_name} · `
                    : ''}
                  {row.last_status_update
                    ? `Akt. ${formatDate(row.last_status_update)}`
                    : 'brak akt.'}
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0 text-xs text-muted-foreground">
                <PriorityBadge bucket={row.priority_bucket} />
                <span className="flex items-center gap-1">
                  <ListChecks className="h-3 w-3" />
                  {row.active_task_count}
                </span>
              </div>
            </button>
          );
        })()
      ))}
    </div>
  );
}
