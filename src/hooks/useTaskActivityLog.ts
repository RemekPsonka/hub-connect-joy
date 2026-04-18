import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  tenant_id: string;
  created_at: string;
  actor?: { id: string; full_name: string } | null;
}

interface AuditRow {
  id: string;
  entity_id: string | null;
  actor_id: string | null;
  action: string;
  diff: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  tenant_id: string;
  created_at: string;
}

export function useTaskActivityLog(taskId: string) {
  return useQuery({
    queryKey: ['task-activity-log', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log' as never)
        .select('*')
        .eq('entity_type', 'task')
        .eq('entity_id', taskId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const rows = (data || []) as unknown as AuditRow[];
      const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x)));
      const actorMap = new Map<string, { id: string; full_name: string }>();
      if (actorIds.length > 0) {
        const { data: directors } = await supabase
          .from('directors')
          .select('id, full_name')
          .in('id', actorIds);
        directors?.forEach((d) => actorMap.set(d.id, { id: d.id, full_name: d.full_name }));
      }

      return rows.map<TaskActivity>((r) => {
        const diff = (r.diff || {}) as { old?: unknown; new?: unknown };
        return {
          id: r.id,
          task_id: r.entity_id || taskId,
          actor_id: r.actor_id,
          action: r.action,
          old_value: diff.old != null ? String(diff.old) : null,
          new_value: diff.new != null ? String(diff.new) : null,
          metadata: r.metadata || {},
          tenant_id: r.tenant_id,
          created_at: r.created_at,
          actor: r.actor_id ? actorMap.get(r.actor_id) ?? null : null,
        };
      });
    },
    enabled: !!taskId,
  });
}
