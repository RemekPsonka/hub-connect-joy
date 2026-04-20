import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { FileText, Mail, Calendar as CalIcon, Sparkles, CheckSquare, GitBranch } from 'lucide-react';
import { useContactTimeline, type TimelineItem } from '@/hooks/useContactTimeline';
import { ActivityComposer } from './ActivityComposer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Wszystko' },
  { key: 'mine', label: 'Moje' },
  { key: 'ai_signals', label: 'AI sygnały' },
  { key: 'email', label: 'Email' },
  { key: 'meeting', label: 'Spotkania' },
  { key: 'note', label: 'Notatki' },
];

function iconFor(kind: TimelineItem['kind']) {
  switch (kind) {
    case 'note': return FileText;
    case 'email': return Mail;
    case 'meeting': return CalIcon;
    case 'ai_signal': return Sparkles;
    case 'task': return CheckSquare;
    case 'deal_change': return GitBranch;
  }
}

function dayLabel(d: Date): string {
  if (isToday(d)) return 'Dziś';
  if (isYesterday(d)) return 'Wczoraj';
  return format(d, 'dd.MM.yyyy', { locale: pl });
}

interface ActivityTimelineProps {
  contactId: string;
}

export function ActivityTimeline({ contactId }: ActivityTimelineProps) {
  const [filter, setFilter] = useState('all');
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useContactTimeline(
    contactId,
    filter,
  );

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const it of items) {
      const key = format(new Date(it.ts), 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <ActivityComposer contactId={contactId} />

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'outline'}
              className="rounded-full h-7 px-3 text-xs"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            Brak interakcji z tym kontaktem — zaplanuj pierwszy kontakt.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, group]) => (
              <div key={day} className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {dayLabel(new Date(day))}
                </div>
                <ul className="space-y-2">
                  {group.map((it) => {
                    const Icon = iconFor(it.kind);
                    const ts = new Date(it.ts);
                    return (
                      <li
                        key={`${it.kind}-${it.id}`}
                        className="flex gap-3 rounded-lg border bg-card p-3"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-medium truncate">{it.title}</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {formatDistanceToNow(ts, { addSuffix: true, locale: pl })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{format(ts, 'dd.MM.yyyy HH:mm')}</TooltipContent>
                            </Tooltip>
                          </div>
                          {it.preview && (
                            <p className={cn('text-sm text-muted-foreground line-clamp-2 mt-0.5')}>
                              {it.preview}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{it.author}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div ref={sentinelRef} className="h-8">
              {isFetchingNextPage && <Skeleton className="h-8" />}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
