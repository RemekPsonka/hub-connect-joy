import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerPanel, AppRole } from './useOwnerPanel';

export interface RoleAuditEntry {
  id: string;
  tenant_id: string;
  target_user_id: string;
  changed_by_user_id: string;
  action: 'role_added' | 'role_removed' | 'role_changed';
  old_role: AppRole | null;
  new_role: AppRole | null;
  details: Record<string, unknown> | null;
  created_at: string;
  target_user?: {
    full_name: string;
    email: string;
  };
  changed_by_user?: {
    full_name: string;
    email: string;
  };
}

interface AuditRow {
  id: string;
  tenant_id: string;
  entity_id: string | null;
  actor_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useRoleAuditLog(limit = 50) {
  const { tenantId, isAdmin } = useOwnerPanel();

  return useQuery({
    queryKey: ['role-audit-log', tenantId, limit],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: entries, error } = await supabase
        .from('audit_log' as never)
        .select('*')
        .eq('entity_type', 'role')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching role audit log:', error);
        throw error;
      }

      const rows = (entries || []) as unknown as AuditRow[];
      if (rows.length === 0) return [];

      const userIds = new Set<string>();
      rows.forEach((e) => {
        if (e.entity_id) userIds.add(e.entity_id);
        if (e.actor_id) userIds.add(e.actor_id);
      });

      const { data: directors } = await supabase
        .from('directors')
        .select('user_id, full_name, email')
        .in('user_id', Array.from(userIds));

      const directorMap = new Map<string, { full_name: string; email: string }>();
      directors?.forEach((d) => {
        directorMap.set(d.user_id, { full_name: d.full_name, email: d.email });
      });

      return rows.map<RoleAuditEntry>((entry) => {
        const meta = (entry.metadata || {}) as {
          old_role?: AppRole | null;
          new_role?: AppRole | null;
          details?: Record<string, unknown> | null;
        };
        return {
          id: entry.id,
          tenant_id: entry.tenant_id,
          target_user_id: entry.entity_id || '',
          changed_by_user_id: entry.actor_id || '',
          action: entry.action as RoleAuditEntry['action'],
          old_role: meta.old_role ?? null,
          new_role: meta.new_role ?? null,
          details: meta.details ?? null,
          created_at: entry.created_at,
          target_user: entry.entity_id ? directorMap.get(entry.entity_id) : undefined,
          changed_by_user: entry.actor_id ? directorMap.get(entry.actor_id) : undefined,
        };
      });
    },
    enabled: !!tenantId && isAdmin === true,
  });
}
