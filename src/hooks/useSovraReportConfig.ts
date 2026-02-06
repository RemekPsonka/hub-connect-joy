import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SovraReportConfig {
  id: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  day_of_week: number;
  time_of_day: string;
  email_override: string | null;
  include_sections: string[];
  last_sent_at: string | null;
}

export function useReportConfig() {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['sovra-report-config', director?.id],
    enabled: !!director?.id,
    queryFn: async (): Promise<SovraReportConfig | null> => {
      const { data, error } = await supabase
        .from('sovra_report_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        enabled: data.enabled ?? false,
        frequency: (data.frequency as 'daily' | 'weekly') || 'weekly',
        day_of_week: data.day_of_week ?? 1,
        time_of_day: data.time_of_day || '08:00',
        email_override: data.email_override,
        include_sections: (data.include_sections as string[]) || ['summary', 'tasks', 'projects', 'contacts', 'calendar'],
        last_sent_at: data.last_sent_at,
      };
    },
  });
}

export function useSaveReportConfig() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (config: Partial<SovraReportConfig>) => {
      if (!director) throw new Error('Brak danych directora');

      const payload = {
        tenant_id: director.tenant_id,
        director_id: director.id,
        enabled: config.enabled ?? false,
        frequency: config.frequency || 'weekly',
        day_of_week: config.day_of_week ?? 1,
        time_of_day: config.time_of_day || '08:00',
        email_override: config.email_override || null,
        include_sections: config.include_sections || ['summary', 'tasks', 'projects', 'contacts', 'calendar'],
      };

      const { error } = await supabase
        .from('sovra_report_config')
        .upsert(payload, { onConflict: 'tenant_id,director_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sovra-report-config'] });
      toast.success('Konfiguracja raportów zapisana');
    },
    onError: (err) => {
      console.error('Save report config error:', err);
      toast.error('Błąd zapisu konfiguracji');
    },
  });
}

export function usePreviewReport() {
  return useMutation({
    mutationFn: async (): Promise<{ preview_html: string }> => {
      const { data, error } = await supabase.functions.invoke('sovra-weekly-report');

      if (error) throw error;
      return data as { preview_html: string };
    },
    onError: (err) => {
      console.error('Preview report error:', err);
      toast.error('Nie udało się wygenerować podglądu raportu');
    },
  });
}
