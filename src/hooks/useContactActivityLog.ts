import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogEntry {
  id: string;
  team_id: string | null;
  team_contact_id: string | null;
  prospect_id: string | null;
  actor_id: string | null;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  created_at: string | null;
  actor?: { id: string; full_name: string };
}

interface AuditRow {
  id: string;
  entity_id: string | null;
  actor_id: string | null;
  action: string;
  diff: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useContactActivityLog(teamContactId: string | undefined) {
  return useQuery({
    queryKey: ['deal-contact-activity-log', teamContactId],
    queryFn: async () => {
      if (!teamContactId) return [];

      const { data, error } = await supabase
        .from('audit_log' as never)
        .select('*')
        .eq('entity_type', 'deal_team')
        .eq('entity_id', teamContactId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const rows = (data || []) as unknown as AuditRow[];
      if (rows.length === 0) return [];

      const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x)));
      const actorMap = new Map<string, { id: string; full_name: string }>();
      if (actorIds.length > 0) {
        const { data: actors } = await supabase
          .from('directors')
          .select('id, full_name')
          .in('id', actorIds);
        actors?.forEach((a) => actorMap.set(a.id, { id: a.id, full_name: a.full_name }));
      }

      return rows.map<ActivityLogEntry>((r) => {
        const diff = (r.diff || {}) as { old?: Record<string, unknown>; new?: Record<string, unknown> };
        const meta = (r.metadata || {}) as {
          team_id?: string | null;
          team_contact_id?: string | null;
          prospect_id?: string | null;
          note?: string | null;
        };
        return {
          id: r.id,
          team_id: meta.team_id ?? null,
          team_contact_id: meta.team_contact_id ?? null,
          prospect_id: meta.prospect_id ?? null,
          actor_id: r.actor_id,
          action: r.action,
          old_value: diff.old ?? null,
          new_value: diff.new ?? null,
          note: meta.note ?? null,
          created_at: r.created_at,
          actor: r.actor_id ? actorMap.get(r.actor_id) : undefined,
        };
      });
    },
    enabled: !!teamContactId,
    staleTime: 30 * 1000,
  });
}
