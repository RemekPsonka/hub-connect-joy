import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Play, Square, Plus, Trash2, Clock, Timer } from 'lucide-react';
import { useTaskTimeEntries, useCreateTimeEntry, useDeleteTimeEntry, useTaskTotalTime } from '@/hooks/useTaskTimeEntries';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';

interface TaskTimeTrackerProps {
  taskId: string;
  estimatedHours?: number | null;
}

const STORAGE_KEY = 'task-timer-';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TaskTimeTracker({ taskId, estimatedHours }: TaskTimeTrackerProps) {
  const { data: entries = [], isLoading } = useTaskTimeEntries(taskId);
  const totalMinutes = useTaskTotalTime(taskId);
  const createEntry = useCreateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual entry
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Restore timer from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY + taskId);
    if (stored) {
      const { startedAt: sa } = JSON.parse(stored);
      setStartedAt(sa);
      setIsRunning(true);
    }
  }, [taskId]);

  // Tick
  useEffect(() => {
    if (isRunning && startedAt) {
      const tick = () => {
        const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
        setElapsed(diff);
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, startedAt]);

  const handleStart = () => {
    const now = new Date().toISOString();
    setStartedAt(now);
    setIsRunning(true);
    localStorage.setItem(STORAGE_KEY + taskId, JSON.stringify({ startedAt: now }));
  };

  const handleStop = async () => {
    if (!startedAt) return;
    const durationMin = Math.max(1, Math.round(elapsed / 60));
    try {
      await createEntry.mutateAsync({
        task_id: taskId,
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        duration_minutes: durationMin,
      });
      toast.success(`Zapisano ${formatDuration(durationMin)}`);
    } catch {
      toast.error('Błąd zapisu czasu');
    }
    setIsRunning(false);
    setStartedAt(null);
    localStorage.removeItem(STORAGE_KEY + taskId);
  };

  const handleManualAdd = async () => {
    const mins = parseInt(manualMinutes);
    if (!mins || mins <= 0) return;
    try {
      await createEntry.mutateAsync({
        task_id: taskId,
        started_at: new Date().toISOString(),
        duration_minutes: mins,
        note: manualNote || undefined,
      });
      setManualMinutes('');
      setManualNote('');
      setShowManual(false);
      toast.success('Wpis czasu dodany');
    } catch {
      toast.error('Błąd dodawania wpisu');
    }
  };

  const estimatedMinutes = estimatedHours ? estimatedHours * 60 : null;
  const progressPercent = estimatedMinutes ? Math.min(100, Math.round((totalMinutes / estimatedMinutes) * 100)) : null;

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            Śledzenie czasu
          </h4>
          <span className="text-xs text-muted-foreground">
            Łącznie: <span className="font-medium text-foreground">{formatDuration(totalMinutes)}</span>
            {estimatedMinutes && (
              <> / {formatDuration(estimatedMinutes)}</>
            )}
          </span>
        </div>

        {/* Progress bar */}
        {progressPercent !== null && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progressPercent > 100 ? 'bg-destructive' : progressPercent > 80 ? 'bg-warning' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        )}

        {/* Timer */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <div className="flex-1 text-center font-mono text-lg text-primary">
                {formatElapsed(elapsed)}
              </div>
              <Button size="sm" variant="destructive" onClick={handleStop} disabled={createEntry.isPending}>
                <Square className="h-3.5 w-3.5 mr-1" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="flex-1" onClick={handleStart}>
                <Play className="h-3.5 w-3.5 mr-1" />
                Rozpocznij timer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowManual(!showManual)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        {/* Manual entry */}
        {showManual && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Minuty"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                className="h-8 text-sm"
                min={1}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Notatka (opcja)"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={handleManualAdd} disabled={!manualMinutes || createEntry.isPending}>
              Dodaj
            </Button>
          </div>
        )}

        {/* Entries list */}
        {entries.length > 0 && (
          <div className="space-y-1 max-h-[150px] overflow-y-auto">
            {entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs py-1 px-2 bg-muted/30 rounded group">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{formatDuration(entry.duration_minutes)}</span>
                  {entry.note && <span className="text-muted-foreground">— {entry.note}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: pl })}
                  </span>
                  <button
                    onClick={() => deleteEntry.mutate({ id: entry.id, taskId })}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
