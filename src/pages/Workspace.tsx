import { useState, useMemo } from 'react';
import { useWorkspaceSchedule } from '@/hooks/useWorkspace';
import { useProjects } from '@/hooks/useProjects';
import { WorkspaceDayCard } from '@/components/workspace/WorkspaceDayCard';
import { WorkspaceDayDashboard } from '@/components/workspace/WorkspaceDayDashboard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { startOfWeek, addWeeks, addDays, format, isToday, isSameWeek } from 'date-fns';
import { pl } from 'date-fns/locale';

const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

export default function Workspace() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const todayDayIndex = (new Date().getDay() + 6) % 7;
  const [activeDay, setActiveDay] = useState(todayDayIndex);

  const { data: schedule = [], isLoading } = useWorkspaceSchedule();
  const { data: projectsRaw = [] } = useProjects();
  const allProjects = useMemo(() =>
    (projectsRaw as any[]).map(p => ({ id: p.id, name: p.name, color: p.color, description: p.description, status: p.status })),
    [projectsRaw]
  );

  // Group schedule entries by day_of_week
  const scheduleMap = useMemo(() => {
    const map: Record<number, any[]> = {};
    schedule.forEach((s: any) => {
      if (!map[s.day_of_week]) map[s.day_of_week] = [];
      map[s.day_of_week].push(s);
    });
    return map;
  }, [schedule]);

  const isCurrentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });
  const activeEntries = scheduleMap[activeDay] || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold text-foreground">Workspace</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(weekStart, 'd MMM', { locale: pl })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pl })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(w => addWeeks(w, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isCurrentWeek ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setActiveDay(todayDayIndex); }}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Dziś
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(w => addWeeks(w, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day bar */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto border-b border-border/30">
        {DAY_NAMES.map((name, i) => {
          const dayDate = addDays(weekStart, i);
          const dayEntries = scheduleMap[i] || [];
          const projects = dayEntries
            .filter((e: any) => e.project)
            .map((e: any) => ({ name: e.project.name, color: e.project.color }));
          return (
            <WorkspaceDayCard
              key={i}
              dayIndex={i}
              dayName={format(dayDate, 'EEE d', { locale: pl })}
              projects={projects}
              isActive={activeDay === i}
              isToday={isToday(dayDate)}
              onClick={() => setActiveDay(i)}
            />
          );
        })}
      </div>

      {/* Dashboard */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="text-muted-foreground text-sm py-12 text-center">Ładowanie...</div>
        ) : (
          <WorkspaceDayDashboard
            dayOfWeek={activeDay}
            dayName={DAY_NAMES[activeDay]}
            entries={activeEntries}
            allProjects={allProjects}
          />
        )}
      </div>
    </div>
  );
}
