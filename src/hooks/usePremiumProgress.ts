import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PremiumProgressData {
  expectedGr: number;
  bookedGr: number;
  paidGr: number;
}

/**
 * Returns premium aggregates for a deal_team_contact (in grosze):
 * - expected: deal_team_contacts.expected_annual_premium_gr
 * - booked: SUM(insurance_policies.forecasted_premium) * 100
 * - paid: SUM(deal_team_payment_schedule.amount WHERE is_paid) * 100
 */
export function usePremiumProgress(dealTeamContactId: string | null | undefined) {
  return useQuery<PremiumProgressData>({
    queryKey: ['sgu-premium-progress', dealTeamContactId],
    queryFn: async () => {
      if (!dealTeamContactId) return { expectedGr: 0, bookedGr: 0, paidGr: 0 };

      const [contactRes, policiesRes, paymentsRes] = await Promise.all([
        supabase
          .from('deal_team_contacts')
          .select('expected_annual_premium_gr')
          .eq('id', dealTeamContactId)
          .maybeSingle(),
        supabase
          .from('insurance_policies')
          .select('forecasted_premium')
          .eq('deal_team_contact_id', dealTeamContactId),
        supabase
          .from('deal_team_payment_schedule')
          .select('amount')
          .eq('team_contact_id', dealTeamContactId)
          .eq('is_paid', true),
      ]);

      if (contactRes.error) throw contactRes.error;
      if (policiesRes.error) throw policiesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const expectedGr = contactRes.data?.expected_annual_premium_gr ?? 0;
      const bookedPln = (policiesRes.data ?? []).reduce(
        (s, p) => s + Number(p.forecasted_premium ?? 0),
        0,
      );
      const paidPln = (paymentsRes.data ?? []).reduce(
        (s, p) => s + Number(p.amount ?? 0),
        0,
      );

      return {
        expectedGr,
        bookedGr: Math.round(bookedPln * 100),
        paidGr: Math.round(paidPln * 100),
      };
    },
    enabled: !!dealTeamContactId,
    staleTime: 30_000,
  });
}
