import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  format,
  isToday,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

interface MiniCalendarProps {
  selectedDate?: Date;
  taskDates?: string[];
  onDateSelect?: (date: Date) => void;
  onMonthChange?: (monthStart: string, monthEnd: string) => void;
}

export function MiniCalendar({
  selectedDate,
  taskDates = [],
  onDateSelect,
  onMonthChange,
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const taskDateSet = new Set(taskDates);

  const goToPrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    setCurrentMonth(prev);
    const s = startOfMonth(prev);
    const e = endOfMonth(prev);
    onMonthChange?.(format(s, 'yyyy-MM-dd'), format(e, 'yyyy-MM-dd'));
  };

  const goToNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    setCurrentMonth(next);
    const s = startOfMonth(next);
    const e = endOfMonth(next);
    onMonthChange?.(format(s, 'yyyy-MM-dd'), format(e, 'yyyy-MM-dd'));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: pl })}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const hasTask = taskDateSet.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect?.(day)}
              className={cn(
                'flex flex-col items-center justify-center py-1 rounded-lg transition-colors text-xs',
                'hover:bg-muted/50',
                !isCurrentMonth && 'text-muted-foreground/30',
                isCurrentMonth && !isTodayDate && !isSelected && 'text-foreground',
                isSelected && !isTodayDate && 'bg-primary/10 text-primary font-semibold',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs',
                  isTodayDate && 'bg-primary text-primary-foreground font-bold',
                )}
              >
                {format(day, 'd')}
              </span>
              {hasTask && isCurrentMonth && (
                <span className="w-1 h-1 bg-primary/60 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
