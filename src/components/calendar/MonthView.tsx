import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  format,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarItem } from '@/types/calendar';
import { CalendarEventPopover } from './CalendarEventPopover';

interface MonthViewProps {
  currentDate: Date;
  items: CalendarItem[];
  onDayClick: (date: Date) => void;
}

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
const MAX_VISIBLE = 3;

export function MonthView({ currentDate, items, onDayClick }: MonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center py-2 text-[10px] uppercase tracking-wider font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const dayItems = items.filter((item) => isSameDay(item.start, day));
          const visible = dayItems.slice(0, MAX_VISIBLE);
          const extra = dayItems.length - MAX_VISIBLE;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[100px] border border-border p-1 text-left transition-colors hover:bg-muted/30',
                !inMonth && 'bg-muted/10'
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-sm mb-0.5',
                  today && 'bg-primary text-primary-foreground font-bold',
                  !inMonth && 'text-muted-foreground/30'
                )}
              >
                {format(day, 'd')}
              </span>

              <div className="space-y-0.5">
                {visible.map((item) => (
                  <CalendarEventPopover key={item.id} item={item}>
                    <div
                      className="truncate text-[11px] px-1 py-0.5 rounded cursor-pointer font-medium"
                      style={{
                        backgroundColor: `${item.color}20`,
                        color: item.color,
                      }}
                    >
                      {item.title}
                    </div>
                  </CalendarEventPopover>
                ))}
                {extra > 0 && (
                  <p className="text-[11px] text-muted-foreground px-1">
                    +{extra} więcej
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
