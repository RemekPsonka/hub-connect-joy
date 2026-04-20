import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSGUTeamId() {
  const { data, isLoading } = useQuery({
    queryKey: ['sgu-team-id'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sgu_settings')
        .select('sgu_team_id, tenant_id, enable_sgu_layout, enable_sgu_prospecting_ai, enable_sgu_reports')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });

  return {
    sguTeamId: data?.sgu_team_id ?? null,
    tenantId: (data as { tenant_id?: string | null } | null | undefined)?.tenant_id ?? null,
    enabled: !!data?.enable_sgu_layout,
    enableProspectingAI: !!(data as { enable_sgu_prospecting_ai?: boolean } | null | undefined)?.enable_sgu_prospecting_ai,
    enableReports: !!(data as { enable_sgu_reports?: boolean } | null | undefined)?.enable_sgu_reports,
    isLoading,
  };
}
