import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MapPin } from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  isSameDay,
  addDays,
  getHours,
  getMinutes,
  differenceInMinutes,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { useCalendarData } from '@/hooks/useCalendarData';
import type { CalendarItem } from '@/types/calendar';

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_HEIGHT = 36; // px per hour
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selected, setSelected] = useState<CalendarItem | null>(null);

  const { items, isLoading, gcalConnected } = useCalendarData({
    view: 'week',
    currentDate,
  });

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      map.set(
        key,
        items.filter((it) => isSameDay(it.start, day))
      );
    }
    return map;
  }, [days, items]);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {format(weekStart, 'd MMM', { locale: pl })} –{' '}
            {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: pl })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setCurrentDate((d) => addWeeks(d, -1))}
            aria-label="Poprzedni tydzień"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setCurrentDate(new Date())}
          >
            Dziś
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setCurrentDate((d) => addWeeks(d, 1))}
            aria-label="Następny tydzień"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!gcalConnected && (
        <div className="px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/50 border-b">
          Google Calendar niepołączony — pokazujemy tylko zadania CRM
        </div>
      )}

      {isLoading ? (
        <div className="p-3 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {/* Day headers */}
          <div className="grid grid-cols-[40px_repeat(7,1fr)] sticky top-0 bg-card border-b z-10">
            <div />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`text-center py-1.5 text-[11px] border-l ${
                  isSameDay(day, new Date()) ? 'bg-primary/5 text-primary font-medium' : ''
                }`}
              >
                <div className="uppercase">{format(day, 'EEE', { locale: pl })}</div>
                <div className="text-sm font-medium">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div
            className="grid grid-cols-[40px_repeat(7,1fr)] relative"
            style={{ height: `${(HOUR_END - HOUR_START + 1) * HOUR_HEIGHT}px` }}
          >
            {/* Hour labels */}
            <div className="border-r">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="text-[10px] text-muted-foreground text-right pr-1"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  {h}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayItems = itemsByDay.get(key) ?? [];
              return (
                <div key={key} className="relative border-l">
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="border-b border-dashed border-muted/40"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Events */}
                  {dayItems.map((item) => {
                    if (item.allDay) {
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelected(item)}
                          className="absolute left-0.5 right-0.5 top-0.5 text-[10px] px-1 py-0.5 rounded text-left truncate hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: `${item.color}22`,
                            borderLeft: `2px solid ${item.color}`,
                            color: item.color,
                          }}
                          title={item.title}
                        >
                          📌 {item.title}
                        </button>
                      );
                    }
                    const startHour = getHours(item.start) + getMinutes(item.start) / 60;
                    const top = (startHour - HOUR_START) * HOUR_HEIGHT;
                    const durationMin = Math.max(
                      30,
                      differenceInMinutes(item.end, item.start) || 60
                    );
                    const height = (durationMin / 60) * HOUR_HEIGHT;
                    if (top < 0 || top > (HOUR_END - HOUR_START) * HOUR_HEIGHT) return null;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className="absolute left-0.5 right-0.5 text-[10px] px-1 py-0.5 rounded text-left overflow-hidden hover:opacity-80 transition-opacity"
                        style={{
                          top: `${top}px`,
                          height: `${height - 2}px`,
                          backgroundColor: `${item.color}22`,
                          borderLeft: `2px solid ${item.color}`,
                          color: item.color,
                        }}
                        title={item.title}
                      >
                        <div className="font-medium truncate">{item.title}</div>
                        <div className="text-[9px] opacity-75">
                          {format(item.start, 'HH:mm')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>
              {selected && (
                <>
                  {format(selected.start, 'EEEE, d MMMM yyyy', { locale: pl })}
                  {!selected.allDay && (
                    <> · {format(selected.start, 'HH:mm')}–{format(selected.end, 'HH:mm')}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {selected?.location && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {selected.location}
              </div>
            )}
            {selected?.calendarName && (
              <div className="text-xs text-muted-foreground">
                Kalendarz: {selected.calendarName}
              </div>
            )}
            {selected?.projectName && (
              <div className="text-xs text-muted-foreground">
                Projekt: {selected.projectName}
              </div>
            )}
            {selected?.status && (
              <div className="text-xs">
                Status: <span className="font-medium">{selected.status}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            {selected?.htmlLink && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <a href={selected.htmlLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Otwórz w GCal
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
