import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarDays, CalendarRange, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getSguDisplayName } from '@/lib/sgu/displayName';
import {
  useSGUNextSteps,
  type NextStepRow,
  type NextStepsScope,
} from '@/hooks/sgu-dashboard/useSGUNextSteps';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

interface RowItemProps {
  row: NextStepRow;
  overdue?: boolean;
  onClick: (companyName: string) => void;
}

function RowItem({ row, overdue, onClick }: RowItemProps) {
  const display = getSguDisplayName({
    companyName: row.companyName,
    fullName: row.fullName,
  });
  const companyForFilter = display.hasCompany ? display.heading : row.fullName;

  return (
    <button
      type="button"
      onClick={() => onClick(companyForFilter)}
      className="w-full text-left flex items-start gap-3 rounded-md border border-border/60 bg-card hover:bg-accent/40 transition-colors px-3 py-2"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{display.heading}</div>
        {display.subtext && (
          <div className="text-xs text-muted-foreground truncate">
            {display.subtext}
          </div>
        )}
        {row.next_action && (
          <div className="text-xs text-foreground/80 mt-1 line-clamp-2">
            {row.next_action}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={
            'text-xs font-medium ' +
            (overdue ? 'text-destructive' : 'text-muted-foreground')
          }
        >
          {formatDate(row.next_action_date)}
        </span>
        {row.assignedName && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
            {row.assignedName}
          </span>
        )}
      </div>
    </button>
  );
}

interface SectionProps {
  title: string;
  rows: NextStepRow[];
  icon: React.ReactNode;
  tone?: 'danger' | 'default';
  onRowClick: (companyName: string) => void;
}

function Section({ title, rows, icon, tone = 'default', onRowClick }: SectionProps) {
  const titleClass =
    tone === 'danger'
      ? 'text-destructive'
      : 'text-foreground';
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-sm font-semibold ${titleClass}`}>
        {icon}
        <span>{title}</span>
        <span className="text-xs font-normal text-muted-foreground">
          ({rows.length})
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground px-3 py-2">—</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <RowItem
              key={r.dtc_id}
              row={r}
              overdue={tone === 'danger'}
              onClick={onRowClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NextStepsCard() {
  const navigate = useNavigate();
  const [scope, setScope] = useState<NextStepsScope>('mine');
  const { data, isLoading } = useSGUNextSteps(scope);

  const handleRowClick = (companyName: string) => {
    navigate(`/sgu/sprzedaz?q=${encodeURIComponent(companyName)}`);
  };

  const allEmpty =
    !!data &&
    data.overdue.length === 0 &&
    data.today.length === 0 &&
    data.thisWeek.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Następne kroki</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Twój tydzień</p>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={scope}
          onValueChange={(v) => {
            if (v === 'mine' || v === 'all') setScope(v);
          }}
        >
          <ToggleGroupItem value="mine">Moje</ToggleGroupItem>
          <ToggleGroupItem value="all">Wszystkie</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : allEmpty ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Brak zaplanowanych kroków na ten tydzień. Ustaw następny krok przy firmie w lejku.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Section
              title="Po terminie"
              icon={<AlertTriangle className="h-4 w-4" />}
              rows={data?.overdue ?? []}
              tone="danger"
              onRowClick={handleRowClick}
            />
            <Section
              title="Dziś"
              icon={<CalendarDays className="h-4 w-4 text-foreground/70" />}
              rows={data?.today ?? []}
              onRowClick={handleRowClick}
            />
            <Section
              title="W tym tygodniu"
              icon={<CalendarRange className="h-4 w-4 text-foreground/70" />}
              rows={data?.thisWeek ?? []}
              onRowClick={handleRowClick}
            />
          </div>
        )}

        {!isLoading && data && (
          <button
            type="button"
            onClick={() => navigate('/sgu/sprzedaz')}
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border/60 pt-3"
          >
            <span>
              Firmy bez następnego kroku: {data.withoutNextStepCount}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}