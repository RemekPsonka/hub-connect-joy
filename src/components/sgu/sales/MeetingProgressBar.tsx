import { formatDistanceToNowStrict } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Users, Sparkles, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MeetingProgress } from '@/hooks/useTeamMeetings';

interface Props {
  progress?: MeetingProgress;
  lastMeetingAt?: string | null;
  openTasksCount: number;
  streak?: number;
  onSaveMeeting: () => void;
  isPending?: boolean;
}

export function MeetingProgressBar({
  progress,
  lastMeetingAt,
  openTasksCount,
  streak = 0,
  onSaveMeeting,
  isPending,
}: Props) {
  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const isComplete = !!progress && progress.total > 0 && progress.done === progress.total;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          {lastMeetingAt ? (
            <>
              <span className="text-sm font-medium">Od ostatniej odprawy</span>
              <span className="text-xs text-muted-foreground">
                ({formatDistanceToNowStrict(new Date(lastMeetingAt), { locale: pl, addSuffix: true })})
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              Brak odpraw — zapisz pierwszą, aby uruchomić licznik
            </span>
          )}
          {progress && progress.total > 0 && (
            <Badge variant="secondary" className="text-xs">
              {progress.done}/{progress.total} ({pct}%)
            </Badge>
          )}
          {isComplete && (
            <Badge className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20">
              <Sparkles className="h-3 w-3 mr-1" />
              100%
            </Badge>
          )}
          {streak > 0 && (
            <Badge className="text-xs bg-orange-500/15 text-orange-700 border-orange-500/30 hover:bg-orange-500/20">
              <Flame className="h-3 w-3 mr-1" />
              {streak} {streak === 1 ? 'tydzień' : 'tygodnie'} z rzędu 100%
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onSaveMeeting} disabled={isPending}>
          <Users className="h-3.5 w-3.5 mr-1.5" />
          Zapisz odprawę ({openTasksCount})
        </Button>
      </div>
      {progress && progress.total > 0 && (
        <Progress
          value={pct}
          className={cn(
            'h-1.5',
            isComplete && '[&>div]:bg-emerald-500',
            !isComplete && pct > 0 && '[&>div]:bg-amber-500',
          )}
        />
      )}
    </div>
  );
}
