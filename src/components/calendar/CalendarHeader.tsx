import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  format,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarHeaderProps {
  view: 'week' | 'month';
  currentDate: Date;
  onViewChange: (view: 'week' | 'month') => void;
  onDateChange: (date: Date) => void;
}

export function CalendarHeader({
  view,
  currentDate,
  onViewChange,
  onDateChange,
}: CalendarHeaderProps) {
  const getDateRange = () => {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'd', { locale: pl })}–${format(end, 'd MMM yyyy', { locale: pl })}`;
    }
    return format(currentDate, 'LLLL yyyy', { locale: pl });
  };

  const goPrev = () => {
    onDateChange(view === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  };

  const goNext = () => {
    onDateChange(view === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  };

  const goToday = () => onDateChange(new Date());

  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      {/* Left: title + range */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-foreground">Kalendarz</h2>
        <span className="text-sm text-muted-foreground capitalize">{getDateRange()}</span>
      </div>

      {/* Center: navigation */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
          Dziś
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: view toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          onClick={() => onViewChange('week')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            view === 'week'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:text-foreground'
          }`}
        >
          Tydzień
        </button>
        <button
          onClick={() => onViewChange('month')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            view === 'month'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:text-foreground'
          }`}
        >
          Miesiąc
        </button>
      </div>
    </div>
  );
}
