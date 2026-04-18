import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfDay } from 'date-fns';
import type { TaskWithDetails } from '@/hooks/useTasks';
import type { ProjectWithOwner } from '@/hooks/useProjects';

export interface ActivityLogEntry {
  id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
  contact_id: string | null;
  contacts?: { id: string; full_name: string } | null;
}

const priorityOrder: Record<string, number> = {
  urgent: 4,
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function sortByPriority(tasks: TaskWithDetails[]): TaskWithDetails[] {
  return [...tasks].sort((a, b) => {
    const aPri = priorityOrder[a.priority || 'low'] || 0;
    const bPri = priorityOrder[b.priority || 'low'] || 0;
    if (bPri !== aPri) return bPri - aPri;
    // Secondary sort: due_date ASC
    const aDate = a.due_date || '9999-12-31';
    const bDate = b.due_date || '9999-12-31';
    return aDate.localeCompare(bDate);
  });
}

export function useMyDayData() {
  const { director } = useAuth();
  const directorId = director?.id;
  const tenantId = director?.tenant_id;
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayStart = startOfDay(new Date()).toISOString();

  const tasksToday = useQuery({
    queryKey: ['my-day-tasks-today', directorId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_contacts(
            contact_id,
            role,
            contacts(id, full_name, company)
          ),
          cross_tasks(
            id, contact_a_id, contact_b_id, connection_reason,
            suggested_intro, intro_made, discussed_with_a,
            discussed_with_b, intro_made_at,
            contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
            contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)
          )
        `)
        .or(`due_date.eq.${today},status.eq.in_progress`)
        .or(`owner_id.eq.${directorId},assigned_to.eq.${directorId}`)
        .not('status', 'in', '("cancelled")')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return sortByPriority((data || []) as TaskWithDetails[]);
    },
    enabled: !!directorId,
    staleTime: 30 * 1000,
  });

  const tasksOverdue = useQuery({
    queryKey: ['my-day-tasks-overdue', directorId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_contacts(
            contact_id,
            role,
            contacts(id, full_name, company)
          ),
          cross_tasks(
            id, contact_a_id, contact_b_id, connection_reason,
            suggested_intro, intro_made, discussed_with_a,
            discussed_with_b, intro_made_at,
            contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
            contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)
          )
        `)
        .lt('due_date', today)
        .not('status', 'in', '("done","cancelled")')
        .or(`owner_id.eq.${directorId},assigned_to.eq.${directorId}`)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return sortByPriority((data || []) as TaskWithDetails[]);
    },
    enabled: !!directorId,
    staleTime: 30 * 1000,
  });

  const tasksDoneToday = useQuery({
    queryKey: ['my-day-tasks-done-today', directorId, today],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('updated_at', todayStart)
        .or(`owner_id.eq.${directorId},assigned_to.eq.${directorId}`);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!directorId,
    staleTime: 30 * 1000,
  });

  const recentActivity = useQuery({
    queryKey: ['my-day-recent-activity', tenantId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('audit_log' as never)
          .select('*')
          .eq('entity_type', 'contact')
          .eq('tenant_id', tenantId!)
          .order('created_at', { ascending: false })
          .limit(8);

        if (error) {
          console.warn('Activity log query failed:', error.message);
          return [] as ActivityLogEntry[];
        }

        const rows = (data || []) as unknown as Array<{
          id: string;
          tenant_id: string;
          entity_id: string | null;
          action: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        }>;

        // Fetch contact names for entity_ids
        const contactIds = Array.from(new Set(rows.map((r) => r.entity_id).filter((x): x is string => !!x)));
        const contactMap = new Map<string, { id: string; full_name: string }>();
        if (contactIds.length > 0) {
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id, full_name')
            .in('id', contactIds);
          contacts?.forEach((c) => contactMap.set(c.id, c));
        }

        return rows.map((r) => {
          const meta = (r.metadata || {}) as { description?: string | null };
          return {
            id: r.id,
            tenant_id: r.tenant_id,
            contact_id: r.entity_id || '',
            activity_type: r.action,
            description: meta.description ?? null,
            metadata: r.metadata,
            created_at: r.created_at,
            contacts: r.entity_id ? contactMap.get(r.entity_id) ?? null : null,
          } as unknown as ActivityLogEntry;
        });
      } catch {
        return [] as ActivityLogEntry[];
      }
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });

  const activeProjects = useQuery({
    queryKey: ['my-day-active-projects', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, owner:directors!projects_owner_id_fkey(id, full_name)')
        .eq('tenant_id', tenantId!)
        .in('status', ['new', 'in_progress', 'analysis'])
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as ProjectWithOwner[];
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });

  const isLoading =
    tasksToday.isLoading ||
    tasksOverdue.isLoading ||
    tasksDoneToday.isLoading ||
    recentActivity.isLoading ||
    activeProjects.isLoading;

  return {
    tasksToday: tasksToday.data || [],
    tasksOverdue: tasksOverdue.data || [],
    tasksDoneTodayCount: tasksDoneToday.data || 0,
    recentActivity: recentActivity.data || [],
    activeProjects: activeProjects.data || [],
    isLoading,
  };
}

export function useCalendarTaskDates(monthStart: string, monthEnd: string) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['my-day-calendar-dates', tenantId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('due_date')
        .eq('tenant_id', tenantId!)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .not('status', 'eq', 'cancelled');

      if (error) throw error;
      return [...new Set(data?.map(t => t.due_date).filter(Boolean))] as string[];
    },
    enabled: !!tenantId && !!monthStart && !!monthEnd,
    staleTime: 60 * 1000,
  });
}
