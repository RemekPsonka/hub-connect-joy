import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  action: string;
  diff: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UseAuditLogParams {
  entityType: string;
  entityId?: string | null;
  limit?: number;
  enabled?: boolean;
}

export function useAuditLog({ entityType, entityId, limit = 50, enabled = true }: UseAuditLogParams) {
  return useQuery({
    queryKey: ['audit-log', entityType, entityId, limit],
    queryFn: async () => {
      let q = supabase
        .from('audit_log' as never)
        .select('*')
        .eq('entity_type', entityType)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (entityId) q = q.eq('entity_id', entityId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AuditLogEntry[];
    },
    enabled: enabled && !!entityType && (entityId === undefined || !!entityId),
    staleTime: 30 * 1000,
  });
}

export function useAuditLogByActor(actorId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['audit-log-actor', actorId, limit],
    queryFn: async () => {
      if (!actorId) return [];
      const { data, error } = await supabase
        .from('audit_log' as never)
        .select('*')
        .eq('actor_id', actorId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as AuditLogEntry[];
    },
    enabled: !!actorId,
  });
}
