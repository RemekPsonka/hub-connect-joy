import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeekView } from '@/components/calendar/WeekView';
import { MonthView } from '@/components/calendar/MonthView';
import { useCalendarData } from '@/hooks/useCalendarData';

export default function Calendar() {
  const navigate = useNavigate();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const { items, isLoading, gcalConnected } = useCalendarData({ view, currentDate });

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView('week');
  };

  return (
    <div className="space-y-4">
      {/* GCal not connected banner */}
      {!gcalConnected && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Połącz Google Calendar aby widzieć spotkania
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300"
            onClick={() => navigate('/settings?tab=integrations')}
          >
            Połącz
          </Button>
        </div>
      )}

      <CalendarHeader
        view={view}
        currentDate={currentDate}
        onViewChange={setView}
        onDateChange={setCurrentDate}
      />

      {isLoading ? (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-8 gap-2">
              {Array.from({ length: 8 }).map((_, j) => (
                <Skeleton key={j} className="h-16 w-full" />
              ))}
            </div>
          ))}
        </div>
      ) : view === 'week' ? (
        <WeekView currentDate={currentDate} items={items} />
      ) : (
        <MonthView currentDate={currentDate} items={items} onDayClick={handleDayClick} />
      )}
    </div>
  );
}
