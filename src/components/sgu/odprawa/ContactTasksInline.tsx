import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContactTasksInlineProps {
  contactId: string;
}

interface InlineTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assignee_name: string | null;
}

function fmtDue(iso: string | null): string {
  if (!iso) return 'bez terminu';
  try {
    return format(new Date(iso), 'dd.MM.yyyy', { locale: pl });
  } catch {
    return 'bez terminu';
  }
}

export function ContactTasksInline({ contactId }: ContactTasksInlineProps) {
  const qc = useQueryClient();

  const tasksQ = useQuery({
    queryKey: ['odprawa-contact-tasks', contactId],
    enabled: !!contactId,
    staleTime: 30_000,
    queryFn: async (): Promise<InlineTask[]> => {
      const { data: links, error: linkErr } = await supabase
        .from('task_contacts')
        .select('task_id')
        .eq('contact_id', contactId);
      if (linkErr) throw linkErr;
      const ids = (links ?? []).map((l) => l.task_id).filter(Boolean) as string[];
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, assignee:directors!tasks_assigned_to_fkey(full_name)')
        .in('id', ids)
        .neq('status', 'completed')
        .neq('status', 'cancelled');
      if (error) throw error;

      const rows = (data ?? []).map((t) => ({
        id: t.id as string,
        title: t.title as string,
        status: t.status as string,
        due_date: (t.due_date as string | null) ?? null,
        assignee_name:
          ((t.assignee as { full_name?: string } | null)?.full_name as string | undefined) ?? null,
      }));

      rows.sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
      return rows;
    },
  });

  const completeMut = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['odprawa-contact-tasks', contactId] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      toast.success('Zadanie zamknięte');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tasks = tasksQ.data ?? [];

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">
        Otwarte zadania{' '}
        <span className="text-xs font-normal text-muted-foreground">({tasks.length})</span>
      </div>
      {tasksQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">Brak otwartych zadań.</div>
      ) : (
        <ul className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm"
            >
              <Checkbox
                checked={false}
                disabled={completeMut.isPending}
                onCheckedChange={() => completeMut.mutate(t.id)}
              />
              <span className={cn('flex-1 truncate')}>{t.title}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {t.assignee_name ? `${t.assignee_name} · ` : ''}
                {fmtDue(t.due_date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
