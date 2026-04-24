import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PriorityBadge } from './PriorityBadge';
import { ListChecks } from 'lucide-react';
import type { OdprawaAgendaRow } from '@/hooks/useOdprawaAgenda';

interface Props {
  rows: OdprawaAgendaRow[] | undefined;
  isLoading: boolean;
  onSelect?: (row: OdprawaAgendaRow) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AgendaList({ rows, isLoading, onSelect }: Props) {
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
        <Card
          key={row.contact_id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect?.(row)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect?.(row);
            }
          }}
          className="hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CardContent className="p-3 flex items-center gap-3">
            <PriorityBadge bucket={row.priority_bucket} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{row.contact_name}</div>
              {row.company_name && (
                <div className="text-xs text-muted-foreground truncate">{row.company_name}</div>
              )}
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              {row.stage && <span className="capitalize">{row.stage}</span>}
              <span className="flex items-center gap-1">
                <ListChecks className="h-3 w-3" />
                {row.active_task_count}
              </span>
              <span>Akt.: {formatDate(row.last_status_update)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
