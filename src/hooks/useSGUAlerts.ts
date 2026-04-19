import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSGUTeamId } from './useSGUTeamId';

export interface ExpiringPolicyAlert {
  id: string;
  end_date: string;
  contact_name?: string | null;
}

export interface OverdueInstallmentAlert {
  id: string;
  scheduled_date: string;
  amount: number;
  client_product_id: string | null;
}

export interface ColdContactAlert {
  id: string;
  contact_id: string | null;
  updated_at: string;
}

export interface SGUAlerts {
  expiringPolicies: ExpiringPolicyAlert[];
  overdueInstallments: OverdueInstallmentAlert[];
  coldContacts: ColdContactAlert[];
}

const daysFromNow = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};

export function useSGUAlerts() {
  const { sguTeamId } = useSGUTeamId();

  return useQuery({
    queryKey: ['sgu-alerts', sguTeamId],
    enabled: !!sguTeamId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SGUAlerts> => {
      const today = new Date().toISOString().slice(0, 10);
      const in14 = daysFromNow(14);
      const past30 = daysFromNow(-30);

      const [policies, installments, cold] = await Promise.all([
        supabase
          .from('insurance_policies')
          .select('id, end_date')
          .eq('deal_team_id', sguTeamId!)
          .gte('end_date', today)
          .lte('end_date', in14)
          .order('end_date', { ascending: true })
          .limit(50),
        supabase
          .from('deal_team_payment_schedule')
          .select('id, scheduled_date, amount, client_product_id')
          .eq('team_id', sguTeamId!)
          .eq('is_paid', false)
          .lt('scheduled_date', today)
          .order('scheduled_date', { ascending: true })
          .limit(50),
        supabase
          .from('deal_team_contacts')
          .select('id, contact_id, updated_at')
          .eq('team_id', sguTeamId!)
          .lt('updated_at', past30)
          .order('updated_at', { ascending: true })
          .limit(50),
      ]);

      return {
        expiringPolicies: (policies.data ?? []) as ExpiringPolicyAlert[],
        overdueInstallments: (installments.data ?? []) as OverdueInstallmentAlert[],
        coldContacts: (cold.data ?? []) as ColdContactAlert[],
      };
    },
  });
}
