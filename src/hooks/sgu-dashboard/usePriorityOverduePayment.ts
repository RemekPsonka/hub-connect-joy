import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardPriorityItem } from '@/types/sgu-dashboard';

const formatPLN = (gr: number) =>
  new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(gr / 100);

export function usePriorityOverduePayment() {
  return useQuery({
    queryKey: ['sgu-priority', 'overdue-payment'],
    queryFn: async (): Promise<DashboardPriorityItem | null> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('deal_team_payment_schedule')
        .select('id, amount, scheduled_date, team_contact_id, is_paid')
        .eq('is_paid', false)
        .lt('scheduled_date', today.toISOString().slice(0, 10))
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const dueDate = new Date(data.scheduled_date).toLocaleDateString('pl-PL');
      return {
        kind: 'payment',
        id: data.id,
        title: `Zaległa rata: ${formatPLN(Number(data.amount ?? 0))}`,
        meta: `Termin: ${dueDate}`,
        navigateTo: `/sgu/klienci?contact=${data.team_contact_id}&tab=raty`,
      };
    },
    staleTime: 60_000,
  });
}
