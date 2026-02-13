import { useTaskActivityLog } from '@/hooks/useTaskActivityLog';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { History, ArrowRight } from 'lucide-react';

interface TaskActivityLogProps {
  taskId: string;
}

const actionLabels: Record<string, string> = {
  status_changed: 'Status',
  priority_changed: 'Priorytet',
  assigned: 'Przypisanie',
  title_changed: 'Tytuł',
  created: 'Utworzono',
  comment_added: 'Komentarz',
};

const statusLabels: Record<string, string> = {
  todo: 'Do zrobienia',
  pending: 'Oczekujące',
  in_progress: 'W trakcie',
  completed: 'Zakończone',
  cancelled: 'Anulowane',
};

const priorityLabels: Record<string, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  urgent: 'Pilny',
};

function formatValue(action: string, value: string | null): string {
  if (!value) return '—';
  if (action === 'status_changed') return statusLabels[value] || value;
  if (action === 'priority_changed') return priorityLabels[value] || value;
  return value;
}

export function TaskActivityLog({ taskId }: TaskActivityLogProps) {
  const { data: activities = [], isLoading } = useTaskActivityLog(taskId);

  if (isLoading) return null;
  if (activities.length === 0) return null;

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          Historia zmian
        </h4>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{a.actor?.full_name || 'System'}</span>
                {' · '}
                <span className="text-muted-foreground">{actionLabels[a.action] || a.action}</span>
                {a.old_value && a.new_value && (
                  <span className="text-muted-foreground">
                    {' '}{formatValue(a.action, a.old_value)}
                    <ArrowRight className="h-2.5 w-2.5 inline mx-0.5" />
                    {formatValue(a.action, a.new_value)}
                  </span>
                )}
                <span className="text-muted-foreground/60 ml-1">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: pl })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
