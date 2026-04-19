import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KRSCriteria {
  pkd_codes?: string[];
  wojewodztwo?: string;
  miasto?: string;
  promien_km?: number;
  revenue_min_pln?: number;
  revenue_max_pln?: number;
  employees_min?: number;
  employees_max?: number;
  forma_prawna?: string[];
  active_only?: boolean;
  max_results?: number;
}

export interface StartKRSResult {
  job_id: string;
  estimated_minutes: number;
}

export function useStartKRSProspecting() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (criteria: KRSCriteria): Promise<StartKRSResult> => {
      const { data, error } = await supabase.functions.invoke('sgu-prospecting-krs', {
        body: criteria,
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string; detail?: string }).detail ?? (data as { error: string }).error);
      }
      return data as StartKRSResult;
    },
    onSuccess: (data) => {
      toast.success(`Uruchomiono wyszukiwanie. Estymacja: ~${data.estimated_minutes} min.`);
      qc.invalidateQueries({ queryKey: ['background-jobs'] });
      qc.invalidateQueries({ queryKey: ['sgu-prospecting-jobs'] });
    },
    onError: (e: Error) => {
      toast.error('Nie udało się uruchomić wyszukiwania', { description: e.message });
    },
  });
}
