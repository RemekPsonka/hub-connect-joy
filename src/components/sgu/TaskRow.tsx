import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarPlus, Phone, MessageSquare } from 'lucide-react';
import { useSGUTaskMutations, type SGUTask } from '@/hooks/useSGUTasks';
import { cn } from '@/lib/utils';

interface Props {
  task: SGUTask;
}

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL') : '—');

export function TaskRow({ task }: Props) {
  const { markDone, snoozeOneDay, updateNote } = useSGUTaskMutations();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(task.description ?? '');

  const isOverdue = task.due_date ? task.due_date < new Date().toISOString().slice(0, 10) : false;

  return (
    <div className="border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors space-y-2">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={() => markDone.mutate(task.id)}
          disabled={markDone.isPending}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug">{task.title}</p>
            <div className="flex items-center gap-1 shrink-0">
              {task.priority === 'high' && <Badge variant="destructive" className="text-[10px]">Wysoki</Badge>}
              <span className={cn('text-xs tabular-nums', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                {formatDate(task.due_date)}
              </span>
            </div>
          </div>
          {task.description && !noteOpen && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 pl-7">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => snoozeOneDay.mutate({ id: task.id, currentDue: task.due_date })}
          disabled={snoozeOneDay.isPending}
        >
          <CalendarPlus className="h-3 w-3 mr-1" />
          +1 dzień
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setNoteOpen((v) => !v)}>
          <MessageSquare className="h-3 w-3 mr-1" />
          Notatka
        </Button>
        {task.contact_phone && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
            <a href={`tel:${task.contact_phone}`}>
              <Phone className="h-3 w-3 mr-1" />
              Zadzwoń
            </a>
          </Button>
        )}
      </div>

      {noteOpen && (
        <div className="pl-7 space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notatka do zadania…"
            className="min-h-[60px] text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                updateNote.mutate(
                  { id: task.id, description: note },
                  { onSuccess: () => setNoteOpen(false) },
                );
              }}
              disabled={updateNote.isPending}
            >
              Zapisz
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
              Anuluj
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
