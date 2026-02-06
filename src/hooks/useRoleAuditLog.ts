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

export function useRoleAuditLog(limit = 50) {
  const { tenantId, isAdmin } = useOwnerPanel();

  return useQuery({
    queryKey: ['role-audit-log', tenantId, limit],
    queryFn: async () => {
      if (!tenantId) return [];

      // Fetch audit log entries
      const { data: entries, error } = await supabase
        .from('role_audit_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching role audit log:', error);
        throw error;
      }

      if (!entries || entries.length === 0) return [];

      // Fetch director info for target users and changed_by users
      const userIds = new Set<string>();
      entries.forEach((e) => {
        userIds.add(e.target_user_id);
        userIds.add(e.changed_by_user_id);
      });

      const { data: directors } = await supabase
        .from('directors')
        .select('user_id, full_name, email')
        .in('user_id', Array.from(userIds));

      const directorMap = new Map<string, { full_name: string; email: string }>();
      directors?.forEach((d) => {
        directorMap.set(d.user_id, { full_name: d.full_name, email: d.email });
      });

      // Combine data
      const enrichedEntries: RoleAuditEntry[] = entries.map((entry) => ({
        id: entry.id,
        tenant_id: entry.tenant_id,
        target_user_id: entry.target_user_id,
        changed_by_user_id: entry.changed_by_user_id,
        action: entry.action as RoleAuditEntry['action'],
        old_role: entry.old_role as AppRole | null,
        new_role: entry.new_role as AppRole | null,
        details: entry.details as Record<string, unknown> | null,
        created_at: entry.created_at ?? new Date().toISOString(),
        target_user: directorMap.get(entry.target_user_id),
        changed_by_user: directorMap.get(entry.changed_by_user_id),
      }));

      return enrichedEntries;
    },
    enabled: !!tenantId && isAdmin === true,
  });
}
