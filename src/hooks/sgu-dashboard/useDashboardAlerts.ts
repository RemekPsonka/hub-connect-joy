import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardAlertsCounts {
  a1: number; // Polisy wygasające <14d
  a2: number; // Raty zaległe 30+d
  a3: number; // Klienci stale 30+d
  a4: number; // Nowe prospekty AI KRS 7d
  a5: number; // Kandydaci na Ambasadora (proxy: 3 z 4 obszarów)
}

export function useDashboardAlerts() {
  return useQuery({
    queryKey: ['sgu-dashboard-alerts'],
    queryFn: async (): Promise<DashboardAlertsCounts> => {
      const now = new Date();
      const in14d = new Date(now);
      in14d.setDate(in14d.getDate() + 14);
      const minus30d = new Date(now);
      minus30d.setDate(minus30d.getDate() - 30);
      const minus7d = new Date(now);
      minus7d.setDate(minus7d.getDate() - 7);
      const todayStr = now.toISOString().slice(0, 10);
      const minus30Str = minus30d.toISOString().slice(0, 10);
      const in14Str = in14d.toISOString().slice(0, 10);

      const [a1, a2, a3, a4, a5Rows] = await Promise.all([
        supabase
          .from('insurance_policies')
          .select('id', { count: 'exact', head: true })
          .gte('end_date', todayStr)
          .lte('end_date', in14Str),
        supabase
          .from('deal_team_payment_schedule')
          .select('id', { count: 'exact', head: true })
          .eq('is_paid', false)
          .lt('scheduled_date', minus30Str),
        supabase
          .from('deal_team_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('deal_stage', 'client')
          .lt('last_status_update', minus30d.toISOString()),
        supabase
          .from('deal_team_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('prospect_source', 'ai_krs')
          .gte('created_at', minus7d.toISOString()),
        // A5 proxy: standard client + dokładnie 1 z 4 potential_*_gr = 0
        // TODO: pełna logika 5/6 complexity (4 obszary + referrals + references) w IA-3 część dalsza
        supabase
          .from('deal_team_contacts')
          .select(
            'potential_property_gr, potential_life_group_gr, potential_communication_gr, potential_financial_gr'
          )
          .eq('client_status', 'standard'),
      ]);

      if (a1.error) throw a1.error;
      if (a2.error) throw a2.error;
      if (a3.error) throw a3.error;
      if (a4.error) throw a4.error;
      if (a5Rows.error) throw a5Rows.error;

      const a5 = (a5Rows.data ?? []).filter((r) => {
        const vals = [
          r.potential_property_gr,
          r.potential_life_group_gr,
          r.potential_communication_gr,
          r.potential_financial_gr,
        ];
        const missing = vals.filter((v) => v === 0 || v == null).length;
        return missing === 1;
      }).length;

      return {
        a1: a1.count ?? 0,
        a2: a2.count ?? 0,
        a3: a3.count ?? 0,
        a4: a4.count ?? 0,
        a5,
      };
    },
    staleTime: 60_000,
  });
}
