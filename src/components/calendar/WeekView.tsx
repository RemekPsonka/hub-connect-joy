import { useMemo, useEffect, useRef, useState } from 'react';
import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  isToday,
  getHours,
  getMinutes,
  differenceInMinutes,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CalendarItem } from '@/types/calendar';
import { CalendarEventPopover } from './CalendarEventPopover';

interface WeekViewProps {
  currentDate: Date;
  items: CalendarItem[];
}

const HOUR_HEIGHT = 64;
const START_HOUR = 7;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

function getEventStyle(item: CalendarItem, overlapIndex: number, overlapCount: number) {
  const startH = getHours(item.start) + getMinutes(item.start) / 60;
  const endH = getHours(item.end) + getMinutes(item.end) / 60;
  const clampedStart = Math.max(startH, START_HOUR);
  const clampedEnd = Math.min(endH, END_HOUR);
  const durationMins = Math.max((clampedEnd - clampedStart) * 60, 20);

  const top = (clampedStart - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max(durationMins * (HOUR_HEIGHT / 60), 24);
  const width = overlapCount > 1 ? `${100 / overlapCount}%` : 'calc(100% - 4px)';
  const left = overlapCount > 1 ? `${(overlapIndex * 100) / overlapCount}%` : '2px';

  return { top: `${top}px`, height: `${height}px`, width, left };
}

/** Group overlapping timed events on the same day */
function computeOverlaps(events: CalendarItem[]) {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const result: { item: CalendarItem; index: number; count: number }[] = [];

  let i = 0;
  while (i < sorted.length) {
    const group: CalendarItem[] = [sorted[i]];
    let maxEnd = sorted[i].end.getTime();

    let j = i + 1;
    while (j < sorted.length && sorted[j].start.getTime() < maxEnd) {
      group.push(sorted[j]);
      maxEnd = Math.max(maxEnd, sorted[j].end.getTime());
      j++;
    }

    group.forEach((item, idx) => {
      result.push({ item, index: idx, count: group.length });
    });

    i = j;
  }

  return result;
}

export function WeekView({ currentDate, items }: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinute, setNowMinute] = useState(Date.now());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const hours = useMemo(() => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i), []);

  // Auto-scroll to 8:00
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - START_HOUR) * HOUR_HEIGHT;
    }
  }, []);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNowMinute(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const allDayItems = items.filter((i) => i.allDay);
  const timedItems = items.filter((i) => !i.allDay);

  const now = new Date(nowMinute);
  const nowH = getHours(now) + getMinutes(now) / 60;
  const nowTop = (nowH - START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b border-border bg-muted/30 sticky top-0 z-10">
        <div className="py-3" />
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <div key={i} className="text-center py-3 border-l border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {DAY_LABELS[i]}
              </p>
              <p
                className={cn(
                  'text-lg font-semibold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full',
                  today && 'bg-primary text-primary-foreground'
                )}
              >
                {format(day, 'd')}
              </p>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      {allDayItems.length > 0 && (
        <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b border-border bg-muted/20">
          <div className="py-1.5 px-1 text-[10px] text-muted-foreground text-right">dzień</div>
          {days.map((day, i) => {
            const dayItems = allDayItems.filter((item) => isSameDay(item.start, day));
            return (
              <div key={i} className="border-l border-border py-1 px-1 min-h-[28px]">
                {dayItems.map((item) => (
                  <CalendarEventPopover key={item.id} item={item}>
                    <button
                      className="block w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate mb-0.5 cursor-pointer"
                      style={{
                        backgroundColor: `${item.color}20`,
                        color: item.color,
                        borderLeft: `3px solid ${item.color}`,
                      }}
                    >
                      {item.title}
                    </button>
                  </CalendarEventPopover>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        <div
          className="grid grid-cols-[4rem_repeat(7,1fr)] relative"
          style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
        >
          {/* Hour labels + lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="col-span-full grid grid-cols-[4rem_repeat(7,1fr)] absolute w-full"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
            >
              <div className="text-right pr-2 -mt-2 text-[11px] text-muted-foreground">
                {`${hour}:00`}
              </div>
              <div className="col-span-7 border-t border-border" />
            </div>
          ))}

          {/* Day columns with events */}
          <div className="col-start-1 col-span-1" /> {/* spacer for time col */}
          {days.map((day, i) => {
            const dayTimed = timedItems.filter((item) => isSameDay(item.start, day));
            const overlaps = computeOverlaps(dayTimed);
            const todayCol = isToday(day);

            return (
              <div
                key={i}
                className="relative border-l border-border"
                style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
              >
                {/* Current time indicator */}
                {todayCol && nowH >= START_HOUR && nowH <= END_HOUR && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${nowTop}px` }}
                  >
                    <div className="relative">
                      <div className="absolute -left-[5px] -top-[4px] w-2.5 h-2.5 rounded-full bg-destructive" />
                      <div className="h-0.5 bg-destructive w-full" />
                    </div>
                  </div>
                )}

                {overlaps.map(({ item, index, count }) => (
                  <CalendarEventPopover key={item.id} item={item}>
                    <button
                      className={cn(
                        'absolute rounded-md px-1.5 py-1 text-[11px] overflow-hidden cursor-pointer transition-shadow hover:shadow-md z-10',
                        item.type === 'crm_task'
                          ? 'bg-primary/10 border-l-[3px] border-l-primary'
                          : ''
                      )}
                      style={{
                        ...getEventStyle(item, index, count),
                        ...(item.type === 'gcal_event'
                          ? {
                              backgroundColor: `${item.color}20`,
                              borderLeft: `3px solid ${item.color}`,
                            }
                          : {}),
                      }}
                    >
                      <p className="font-medium truncate leading-tight">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(item.start, 'HH:mm')}
                      </p>
                    </button>
                  </CalendarEventPopover>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
