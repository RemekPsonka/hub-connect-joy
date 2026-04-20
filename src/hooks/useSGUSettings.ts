import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SGUSettingsRow {
  id?: string;
  tenant_id: string | null;
  sgu_team_id: string | null;
  enable_sgu_layout: boolean;
  enable_sgu_prospecting_ai: boolean;
  enable_sgu_reports: boolean;
}

export function useSGUSettings() {
  return useQuery<SGUSettingsRow | null>({
    queryKey: ['sgu-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sgu_settings')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SGUSettingsRow | null;
    },
    staleTime: 60_000,
  });
}

export function useUpdateSGUSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<SGUSettingsRow> & { tenant_id: string }) => {
      const { data, error } = await supabase
        .from('sgu_settings')
        .upsert(patch, { onConflict: 'tenant_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Ustawienia zapisane');
      qc.invalidateQueries({ queryKey: ['sgu-settings'] });
      qc.invalidateQueries({ queryKey: ['sgu-team-id'] });
    },
    onError: (e: Error) => toast.error(`Nie udało się zapisać: ${e.message}`),
  });
}
