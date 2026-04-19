import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CaseDStatus {
  tenant_id: string;
  case_d_confirmed: boolean;
  case_d_confirmed_at: string | null;
  case_d_confirmed_by_user_id: string | null;
  confirmed_by_email: string | null;
}

export function useCaseDStatus() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['case-d-status'],
    queryFn: async (): Promise<CaseDStatus | null> => {
      const { data: tenantId } = await supabase.rpc('get_current_tenant_id');
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('sgu_settings')
        .select('tenant_id, case_d_confirmed, case_d_confirmed_at, case_d_confirmed_by_user_id')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      return { ...data, confirmed_by_email: null } as CaseDStatus;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data: tenantId } = await supabase.rpc('get_current_tenant_id');
      if (!tenantId) throw new Error('Brak tenant_id');
      const { data: userRes } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('sgu_settings')
        .update({
          case_d_confirmed: true,
          case_d_confirmed_at: new Date().toISOString(),
          case_d_confirmed_by_user_id: userRes.user?.id ?? null,
        })
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Case D aktywowany. Algorytm v2 działa.');
      qc.invalidateQueries({ queryKey: ['case-d-status'] });
    },
    onError: (e: Error) => toast.error('Błąd aktywacji: ' + e.message),
  });

  return { ...query, confirmMutation };
}
