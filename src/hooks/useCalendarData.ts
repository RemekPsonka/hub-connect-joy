import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGCalConnection, useGCalEvents } from '@/hooks/useGoogleCalendar';
import type { CalendarItem, GCalEvent } from '@/types/calendar';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#9ca3af',
};

export function gcalToItem(event: GCalEvent): CalendarItem {
  const allDay = !event.start.dateTime;
  const startStr = event.start.dateTime || event.start.date || '';
  const endStr = event.end.dateTime || event.end.date || '';

  return {
    id: `gcal-${event.id}`,
    title: event.summary,
    start: allDay ? parseISO(startStr) : parseISO(startStr),
    end: allDay ? parseISO(endStr) : parseISO(endStr),
    type: 'gcal_event',
    color: event.color || '#4285f4',
    allDay,
    location: event.location,
    htmlLink: event.htmlLink,
    calendarName: event.calendar_name,
  };
}

interface UseCalendarDataProps {
  view: 'week' | 'month';
  currentDate: Date;
}

export function useCalendarData({ view, currentDate }: UseCalendarDataProps) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;
  const { isConnected } = useGCalConnection();

  const { timeMin, timeMax } = useMemo(() => {
    let start: Date;
    let end: Date;

    if (view === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    };
  }, [view, currentDate]);

  const timeMinDate = format(new Date(timeMin), 'yyyy-MM-dd');
  const timeMaxDate = format(new Date(timeMax), 'yyyy-MM-dd');

  // GCal events
  const { data: gcalEvents = [], isLoading: isLoadingGcal } = useGCalEvents(
    timeMin,
    timeMax,
    isConnected
  );

  // CRM tasks with due_date in range
  const { data: crmTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['calendar-tasks', tenantId, timeMinDate, timeMaxDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, project_id, projects(name)')
        .eq('tenant_id', tenantId!)
        .gte('due_date', timeMinDate)
        .lte('due_date', timeMaxDate)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const items: CalendarItem[] = useMemo(() => {
    const gcalItems = gcalEvents.map(gcalToItem);

    const taskItems: CalendarItem[] = crmTasks.map((task: any) => {
      const dueDate = parseISO(task.due_date);
      return {
        id: `task-${task.id}`,
        title: task.title,
        start: dueDate,
        end: dueDate,
        type: 'crm_task' as const,
        color: PRIORITY_COLORS[task.priority || 'low'] || PRIORITY_COLORS.low,
        allDay: true,
        status: task.status,
        projectName: task.projects?.name,
      };
    });

    return [...gcalItems, ...taskItems].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
  }, [gcalEvents, crmTasks]);

  return {
    items,
    isLoading: isLoadingGcal || isLoadingTasks,
    gcalConnected: isConnected,
  };
}
