import { Activity, CheckCircle2, StickyNote, GitBranch, Flag } from 'lucide-react';
import { useContactHistory, type HistoryEventType } from '@/hooks/odprawa/useContactHistory';

interface Props {
  dealTeamContactId: string;
  teamContactId?: string;
}

const ICONS: Record<HistoryEventType, typeof Activity> = {
  decision: Activity,
  task_completed: CheckCircle2,
  note: StickyNote,
  stage_change: GitBranch,
  milestone_reached: Flag,
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ContactHistoryPanel({ dealTeamContactId, teamContactId }: Props) {
  const { data: events = [], isLoading } = useContactHistory(dealTeamContactId, teamContactId);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Historia kontaktu</h3>
      {isLoading && <p className="text-xs text-muted-foreground">Ładowanie…</p>}
      {!isLoading && events.length === 0 && (
        <p className="text-xs text-muted-foreground">Brak historii</p>
      )}
      <ul className="space-y-2">
        {events.map((e) => {
          const Icon = ICONS[e.type];
          return (
            <li key={e.id} className="flex items-start gap-2 text-sm">
              <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-muted-foreground text-xs">
                  {formatRelative(e.timestamp)} · {e.actorName}
                </div>
                <div className="break-words">{e.label}</div>
                {e.detail && (
                  <div className="text-xs text-muted-foreground break-words">{e.detail}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
