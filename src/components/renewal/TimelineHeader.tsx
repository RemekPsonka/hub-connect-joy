import { useMemo } from 'react';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, addMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { TimeViewMode } from './types';

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  viewMode: TimeViewMode;
  darkMode: boolean;
}

export function TimelineHeader({ startDate, endDate, viewMode, darkMode }: TimelineHeaderProps) {
  const periods = useMemo(() => {
    switch (viewMode) {
      case 'months':
        return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
          key: format(date, 'yyyy-MM'),
          label: format(date, 'MMM', { locale: pl }).toUpperCase(),
          sublabel: format(date, 'yyyy'),
          start: startOfMonth(date),
          end: endOfMonth(date),
        }));
      case 'quarters':
        const quarters: { key: string; label: string; sublabel: string; start: Date; end: Date }[] = [];
        let current = startOfQuarter(startDate);
        while (current <= endDate) {
          const q = Math.ceil((current.getMonth() + 1) / 3);
          quarters.push({
            key: `${current.getFullYear()}-Q${q}`,
            label: `Q${q}`,
            sublabel: format(current, 'yyyy'),
            start: startOfQuarter(current),
            end: endOfQuarter(current),
          });
          current = addMonths(current, 3);
        }
        return quarters;
      case 'semesters':
        const semesters: { key: string; label: string; sublabel: string; start: Date; end: Date }[] = [];
        let semCurrent = startOfMonth(startDate);
        while (semCurrent <= endDate) {
          const isFirst = semCurrent.getMonth() < 6;
          const semStart = isFirst 
            ? new Date(semCurrent.getFullYear(), 0, 1)
            : new Date(semCurrent.getFullYear(), 6, 1);
          const semEnd = isFirst
            ? new Date(semCurrent.getFullYear(), 5, 30)
            : new Date(semCurrent.getFullYear(), 11, 31);
          
          const key = `${semCurrent.getFullYear()}-H${isFirst ? 1 : 2}`;
          if (!semesters.find(s => s.key === key)) {
            semesters.push({
              key,
              label: isFirst ? 'H1' : 'H2',
              sublabel: format(semCurrent, 'yyyy'),
              start: semStart,
              end: semEnd,
            });
          }
          semCurrent = addMonths(semCurrent, 6);
        }
        return semesters;
    }
  }, [startDate, endDate, viewMode]);

  return (
    <div className="flex border-b">
      <div 
        className={`w-32 shrink-0 p-2 text-xs font-medium border-r ${
          darkMode ? 'bg-slate-800 text-slate-300' : 'bg-muted text-muted-foreground'
        }`}
      >
        POLISY
      </div>
      <div className="flex flex-1">
        {periods.map((period, index) => (
          <div
            key={period.key}
            className={`flex-1 min-w-16 p-2 text-center border-r last:border-r-0 ${
              darkMode ? 'bg-slate-800 text-slate-300' : 'bg-muted text-muted-foreground'
            }`}
          >
            <div className="text-xs font-semibold">{period.label}</div>
            {(index === 0 || periods[index - 1]?.sublabel !== period.sublabel) && (
              <div className="text-[10px] opacity-70">{period.sublabel}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function getTimelinePeriods(startDate: Date, endDate: Date, viewMode: TimeViewMode) {
  switch (viewMode) {
    case 'months':
      return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
        key: format(date, 'yyyy-MM'),
        start: startOfMonth(date),
        end: endOfMonth(date),
      }));
    case 'quarters':
      const quarters: { key: string; start: Date; end: Date }[] = [];
      let current = startOfQuarter(startDate);
      while (current <= endDate) {
        const q = Math.ceil((current.getMonth() + 1) / 3);
        quarters.push({
          key: `${current.getFullYear()}-Q${q}`,
          start: startOfQuarter(current),
          end: endOfQuarter(current),
        });
        current = addMonths(current, 3);
      }
      return quarters;
    case 'semesters':
      const semesters: { key: string; start: Date; end: Date }[] = [];
      let semCurrent = startOfMonth(startDate);
      while (semCurrent <= endDate) {
        const isFirst = semCurrent.getMonth() < 6;
        const semStart = isFirst 
          ? new Date(semCurrent.getFullYear(), 0, 1)
          : new Date(semCurrent.getFullYear(), 6, 1);
        const semEnd = isFirst
          ? new Date(semCurrent.getFullYear(), 5, 30)
          : new Date(semCurrent.getFullYear(), 11, 31);
        
        const key = `${semCurrent.getFullYear()}-H${isFirst ? 1 : 2}`;
        if (!semesters.find(s => s.key === key)) {
          semesters.push({ key, start: semStart, end: semEnd });
        }
        semCurrent = addMonths(semCurrent, 6);
      }
      return semesters;
  }
}
