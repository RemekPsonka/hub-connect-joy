import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSGUAccess } from '@/hooks/useSGUAccess';

export interface SGUPolicyLite {
  id: string;
  policy_type: string | null;
  policy_name: string | null;
  end_date: string | null;
  start_date: string | null;
  forecasted_premium: number | null;
  actual_premium: number | null;
  insurer_name: string | null;
}

export interface SGUPaymentLite {
  id: string;
  scheduled_date: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  description: string | null;
  payment_type: string | null;
  team_contact_id: string;
}

export interface SGUClientRow {
  id: string;
  contact_id: string | null;
  source_contact_id: string | null;
  full_name: string;
  company: string | null;
  representative_user_id: string | null;
  expected_annual_premium_gr: number;
  client_status: string | null;
  potential_property_gr: number;
  potential_financial_gr: number;
  potential_communication_gr: number;
  potential_life_group_gr: number;
  policies: SGUPolicyLite[];
  payments: SGUPaymentLite[];
  bookedPln: number;
  paidPln: number;
  commissionYtdGr: number;
  nextPaymentDate: string | null;
  nextPolicyEndDate: string | null;
  nextEvent: string | null;
  lastPayment: SGUPaymentLite | null;
}

export interface SGUClientsPortfolio {
  rows: SGUClientRow[];
  totals: {
    clientsCount: number;
    avgPremiumPerClientGr: number;
    portfolioBookedPln: number;
    portfolioBookedPlnPrevMonth: number;
    overdueCount: number;
    overdueAmountPln: number;
    renewals30dCount: number;
    commissionMonthGr: number;
    commissionPrevMonthGr: number;
    ambassadorsCount: number;
    complexClientsCount: number;
  };
}

function startOfMonthISO(offset = 0): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString();
}

function startOfYearISO(): string {
  const d = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  return d.toISOString();
}

export function useSGUClientsPortfolio(teamId: string | null | undefined) {
  const { isPartner, isRep } = useSGUAccess();

  return useQuery<SGUClientsPortfolio>({
    queryKey: ['sgu-clients-portfolio', teamId, isRep, isPartner],
    enabled: !!teamId,
    staleTime: 60_000,
    queryFn: async () => {
      const empty: SGUClientsPortfolio = {
        rows: [],
        totals: {
          clientsCount: 0,
          avgPremiumPerClientGr: 0,
          portfolioBookedPln: 0,
          portfolioBookedPlnPrevMonth: 0,
          overdueCount: 0,
          overdueAmountPln: 0,
          renewals30dCount: 0,
          commissionMonthGr: 0,
          commissionPrevMonthGr: 0,
          ambassadorsCount: 0,
          complexClientsCount: 0,
        },
      };
      if (!teamId) return empty;

      // Authed user (for rep filter)
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;

      // 1) Clients in team
      let clientsQuery = supabase
        .from('deal_team_contacts')
        .select(
          'id, contact_id, source_contact_id, representative_user_id, expected_annual_premium_gr, client_status, potential_property_gr, potential_financial_gr, potential_communication_gr, potential_life_group_gr, contact:contacts!deal_team_contacts_contact_id_fkey(full_name, company)'
        )
        .eq('team_id', teamId)
        .eq('category', 'client');

      // Rep visibility — only assigned (active)
      if (isRep && !isPartner && userId) {
        const { data: assigns } = await supabase
          .from('deal_team_representative_assignments')
          .select('deal_team_contact_id')
          .eq('team_id', teamId)
          .eq('representative_user_id', userId)
          .eq('active', true);
        const ids = (assigns ?? []).map((a) => a.deal_team_contact_id);
        if (ids.length === 0) return empty;
        clientsQuery = clientsQuery.in('id', ids);
      }

      const { data: clientsRaw, error: clientsErr } = await clientsQuery;
      if (clientsErr) throw clientsErr;
      const clients = clientsRaw ?? [];
      if (clients.length === 0) return empty;

      const clientIds = clients.map((c) => c.id);

      // 2) Policies + payments + commissions in parallel
      const ytdStart = startOfYearISO();
      const monthStart = startOfMonthISO(0);
      const prevMonthStart = startOfMonthISO(-1);

      const [policiesRes, paymentsRes, commYtdRes, commMonthRes, commPrevMonthRes] =
        await Promise.all([
          supabase
            .from('insurance_policies')
            .select(
              'id, deal_team_contact_id, policy_type, policy_name, start_date, end_date, forecasted_premium, actual_premium, insurer_name'
            )
            .in('deal_team_contact_id', clientIds),
          supabase
            .from('deal_team_payment_schedule')
            .select(
              'id, team_contact_id, scheduled_date, amount, is_paid, paid_at, description, payment_type'
            )
            .in('team_contact_id', clientIds),
          supabase
            .from('commission_entries')
            .select('amount_gr, deal_team_contact_id, recipient_user_id, created_at')
            .eq('team_id', teamId)
            .gte('created_at', ytdStart),
          supabase
            .from('commission_entries')
            .select('amount_gr, recipient_user_id')
            .eq('team_id', teamId)
            .gte('created_at', monthStart),
          supabase
            .from('commission_entries')
            .select('amount_gr, recipient_user_id')
            .eq('team_id', teamId)
            .gte('created_at', prevMonthStart)
            .lt('created_at', monthStart),
        ]);

      if (policiesRes.error) throw policiesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (commYtdRes.error) throw commYtdRes.error;
      if (commMonthRes.error) throw commMonthRes.error;
      if (commPrevMonthRes.error) throw commPrevMonthRes.error;

      const policies = policiesRes.data ?? [];
      const payments = paymentsRes.data ?? [];
      const commYtd = commYtdRes.data ?? [];
      const commMonth = commMonthRes.data ?? [];
      const commPrev = commPrevMonthRes.data ?? [];

      // Group helpers
      const policiesByClient = new Map<string, SGUPolicyLite[]>();
      for (const p of policies) {
        if (!p.deal_team_contact_id) continue;
        const arr = policiesByClient.get(p.deal_team_contact_id) ?? [];
        arr.push({
          id: p.id,
          policy_type: p.policy_type,
          policy_name: p.policy_name,
          start_date: p.start_date,
          end_date: p.end_date,
          forecasted_premium: p.forecasted_premium == null ? null : Number(p.forecasted_premium),
          actual_premium: p.actual_premium == null ? null : Number(p.actual_premium),
          insurer_name: p.insurer_name,
        });
        policiesByClient.set(p.deal_team_contact_id, arr);
      }

      const paymentsByClient = new Map<string, SGUPaymentLite[]>();
      for (const pay of payments) {
        const arr = paymentsByClient.get(pay.team_contact_id) ?? [];
        arr.push({ ...pay, amount: Number(pay.amount ?? 0) });
        paymentsByClient.set(pay.team_contact_id, arr);
      }

      const commYtdByClient = new Map<string, number>();
      for (const ce of commYtd) {
        if (!ce.deal_team_contact_id) continue;
        if (isRep && !isPartner && ce.recipient_user_id !== userId) continue;
        commYtdByClient.set(
          ce.deal_team_contact_id,
          (commYtdByClient.get(ce.deal_team_contact_id) ?? 0) + Number(ce.amount_gr ?? 0)
        );
      }

      const today = new Date();
      const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);

      let overdueCount = 0;
      let overdueAmountPln = 0;
      let renewals30dCount = 0;
      let portfolioBookedPln = 0;

      const rows: SGUClientRow[] = clients.map((c) => {
        const cps = policiesByClient.get(c.id) ?? [];
        const pays = (paymentsByClient.get(c.id) ?? []).slice().sort((a, b) =>
          a.scheduled_date.localeCompare(b.scheduled_date)
        );
        const bookedPln = cps.reduce((s, p) => s + Number(p.forecasted_premium ?? 0), 0);
        const paidPln = pays.filter((p) => p.is_paid).reduce((s, p) => s + p.amount, 0);
        portfolioBookedPln += bookedPln;

        for (const p of pays) {
          if (!p.is_paid && p.scheduled_date < today0.slice(0, 10)) {
            overdueCount += 1;
            overdueAmountPln += p.amount;
          }
        }
        for (const pol of cps) {
          if (pol.end_date && pol.end_date >= today0.slice(0, 10) && pol.end_date <= in30.toISOString().slice(0, 10)) {
            renewals30dCount += 1;
          }
        }

        const nextPayment = pays.find((p) => !p.is_paid);
        const nextPolicy = cps
          .filter((p) => p.end_date && p.end_date >= today0.slice(0, 10))
          .sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? ''))[0];
        const nextPaymentDate = nextPayment?.scheduled_date ?? null;
        const nextPolicyEndDate = nextPolicy?.end_date ?? null;
        let nextEvent: string | null = null;
        if (nextPaymentDate && nextPolicyEndDate) {
          nextEvent = nextPaymentDate < nextPolicyEndDate ? nextPaymentDate : nextPolicyEndDate;
        } else nextEvent = nextPaymentDate ?? nextPolicyEndDate;

        const lastPayment =
          pays.filter((p) => p.is_paid).sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))[0] ?? null;

        return {
          id: c.id,
          contact_id: c.contact_id,
          source_contact_id: c.source_contact_id,
          full_name: (c.contact as { full_name?: string; company?: string | null } | null)?.full_name ?? '—',
          company: (c.contact as { full_name?: string; company?: string | null } | null)?.company ?? null,
          representative_user_id: c.representative_user_id,
          expected_annual_premium_gr: c.expected_annual_premium_gr ?? 0,
          client_status: (c as { client_status?: string | null }).client_status ?? null,
          potential_property_gr: Number((c as { potential_property_gr?: number }).potential_property_gr ?? 0),
          potential_financial_gr: Number((c as { potential_financial_gr?: number }).potential_financial_gr ?? 0),
          potential_communication_gr: Number((c as { potential_communication_gr?: number }).potential_communication_gr ?? 0),
          potential_life_group_gr: Number((c as { potential_life_group_gr?: number }).potential_life_group_gr ?? 0),
          policies: cps,
          payments: pays,
          bookedPln,
          paidPln,
          commissionYtdGr: commYtdByClient.get(c.id) ?? 0,
          nextPaymentDate,
          nextPolicyEndDate,
          nextEvent,
          lastPayment,
        };
      });

      // Prev-month booked portfolio (proxy: policies created last month)
      // Approximation — use forecasted_premium for policies whose start_date < monthStart
      const portfolioBookedPlnPrevMonth = policies
        .filter((p) => p.start_date && p.start_date < monthStart.slice(0, 10))
        .reduce((s, p) => s + Number(p.forecasted_premium ?? 0), 0);

      const filteredCommMonth = commMonth.filter(
        (ce) => !(isRep && !isPartner) || ce.recipient_user_id === userId
      );
      const filteredCommPrev = commPrev.filter(
        (ce) => !(isRep && !isPartner) || ce.recipient_user_id === userId
      );
      const commissionMonthGr = filteredCommMonth.reduce((s, ce) => s + Number(ce.amount_gr ?? 0), 0);
      const commissionPrevMonthGr = filteredCommPrev.reduce((s, ce) => s + Number(ce.amount_gr ?? 0), 0);

      const totalExpectedGr = rows.reduce((s, r) => s + r.expected_annual_premium_gr, 0);
      const avgPremiumPerClientGr = rows.length > 0 ? Math.round(totalExpectedGr / rows.length) : 0;

      const ambassadorsCount = rows.filter((r) => r.client_status === 'ambassador').length;
      const complexClientsCount = rows.filter((r) => {
        const active =
          (r.potential_property_gr > 0 ? 1 : 0) +
          (r.potential_financial_gr > 0 ? 1 : 0) +
          (r.potential_communication_gr > 0 ? 1 : 0) +
          (r.potential_life_group_gr > 0 ? 1 : 0);
        return active >= 3;
      }).length;

      return {
        rows: rows.sort((a, b) => b.expected_annual_premium_gr - a.expected_annual_premium_gr),
        totals: {
          clientsCount: rows.length,
          avgPremiumPerClientGr,
          portfolioBookedPln,
          portfolioBookedPlnPrevMonth,
          overdueCount,
          overdueAmountPln,
          renewals30dCount,
          commissionMonthGr,
          commissionPrevMonthGr,
          ambassadorsCount,
          complexClientsCount,
        },
      };
    },
  });
}
