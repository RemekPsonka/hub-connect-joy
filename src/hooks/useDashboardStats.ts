import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardStats {
  total_contacts: number;
  new_contacts_30d: number;
  contacts_prev_30d: number;
  today_consultations: number;
  pending_tasks: number;
  active_needs: number;
  active_offers: number;
  pending_matches: number;
  upcoming_meetings: number;
  healthy_contacts: number;
  warning_contacts: number;
  critical_contacts: number;
  refreshed_at: string;
}

export function useDashboardStats() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['dashboard-stats', tenantId],
    queryFn: async (): Promise<DashboardStats | null> => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 min (MV refreshuje się triggerami)
    refetchOnWindowFocus: true,
  });
}
