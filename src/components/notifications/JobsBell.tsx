import { useState } from 'react';
import { Bell, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useMyJobs, useJobRealtime, type BackgroundJob } from '@/hooks/useBackgroundJobs';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

function statusIcon(status: BackgroundJob['status']) {
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'running': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'cancelled': return <XCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function jobLabel(job: BackgroundJob): string {
  if (job.job_type === 'enrich_company') return 'Wzbogacanie firmy';
  return job.job_type;
}

export function JobsBell() {
  const [open, setOpen] = useState(false);
  useJobRealtime();
  const { data: jobs = [] } = useMyJobs(10);

  const activeCount = jobs.filter(j => j.status === 'pending' || j.status === 'running').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
          aria-label="Zadania w tle"
        >
          <Bell className="h-4 w-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Zadania w tle</h3>
          <p className="text-xs text-muted-foreground">
            {activeCount > 0 ? `${activeCount} w trakcie` : 'Brak aktywnych zadań'}
          </p>
        </div>
        <ScrollArea className="max-h-96">
          {jobs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Brak zadań
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {jobs.map(job => (
                <li key={job.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5">{statusIcon(job.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{jobLabel(job)}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {job.status}
                      </Badge>
                    </div>
                    {job.status === 'running' && (
                      <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                    {job.error && (
                      <p className="mt-1 text-xs text-destructive truncate">{job.error}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: pl })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
