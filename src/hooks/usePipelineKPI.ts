import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Sprint 03: pipeline_kpi_targets został zarchiwizowany.
 * KPI dla zespołów żyje teraz w deal_teams.kpi_targets (JSONB), w formacie:
 *   { yearly: { "2026": { target_premium, target_commission, target_commission_rate, monthly: { "1": {target_premium, target_commission}, ... } } } }
 *
 * Ten hook agreguje cele po wszystkich zespołach tenanta (zachowuje API zwracające flat array PipelineKPITarget[])
 * — by widoki Production* (ProductionTable / KPICards / Chart) działały bez zmian.
 */
export interface PipelineKPITarget {
  id: string; // syntetyczne `team:year:month`
  tenant_id: string;
  year: number;
  month: number | null;
  target_premium: number;
  target_commission: number | null;
  target_commission_rate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateKPIInput {
  year: number;
  month?: number | null;
  target_premium: number;
  target_commission?: number | null;
  target_commission_rate?: number | null;
  notes?: string | null;
}

interface UpdateKPIInput extends Partial<CreateKPIInput> {
  id: string;
}

interface YearlyKPI {
  target_premium?: number;
  target_commission?: number | null;
  target_commission_rate?: number | null;
  monthly?: Record<string, { target_premium?: number; target_commission?: number | null }>;
}

interface KPITargetsJSON {
  yearly?: Record<string, YearlyKPI>;
}

export function usePipelineKPI(year: number) {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  const { data: targets, isLoading, error } = useQuery({
    queryKey: ['pipeline-kpi', tenantId, year],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('deal_teams')
        .select('id, tenant_id, kpi_targets')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Aggregate across all teams (sum yearly + monthly)
      let yearlyPremium = 0;
      let yearlyCommission = 0;
      let yearlyRate: number | null = null;
      const monthlyAgg: Record<string, { target_premium: number; target_commission: number }> = {};

      for (const team of data || []) {
        const kpi = (team.kpi_targets as KPITargetsJSON | null) || {};
        const yearly = kpi.yearly?.[String(year)];
        if (!yearly) continue;

        yearlyPremium += Number(yearly.target_premium || 0);
        yearlyCommission += Number(yearly.target_commission || 0);
        if (yearly.target_commission_rate != null) yearlyRate = Number(yearly.target_commission_rate);

        for (const [m, mv] of Object.entries(yearly.monthly || {})) {
          if (!monthlyAgg[m]) monthlyAgg[m] = { target_premium: 0, target_commission: 0 };
          monthlyAgg[m].target_premium += Number(mv.target_premium || 0);
          monthlyAgg[m].target_commission += Number(mv.target_commission || 0);
        }
      }

      const out: PipelineKPITarget[] = [];

      if (yearlyPremium > 0 || yearlyCommission > 0) {
        out.push({
          id: `tenant:${year}:null`,
          tenant_id: tenantId,
          year,
          month: null,
          target_premium: yearlyPremium,
          target_commission: yearlyCommission,
          target_commission_rate: yearlyRate,
          notes: null,
          created_at: '',
          updated_at: '',
        });
      }

      for (const [m, mv] of Object.entries(monthlyAgg)) {
        out.push({
          id: `tenant:${year}:${m}`,
          tenant_id: tenantId,
          year,
          month: Number(m),
          target_premium: mv.target_premium,
          target_commission: mv.target_commission,
          target_commission_rate: null,
          notes: null,
          created_at: '',
          updated_at: '',
        });
      }

      return out.sort((a, b) => (a.month ?? -1) - (b.month ?? -1));
    },
    enabled: !!tenantId,
  });

  const yearlyTarget = targets?.find((t) => t.month === null) || null;
  const monthlyTargets = targets?.filter((t) => t.month !== null) || [];

  // ── Mutations: zapis trafia do PIERWSZEGO zespołu tenanta (single-tenant model — 1 user) ──

  const writeToFirstTeam = async (mutator: (kpi: KPITargetsJSON) => KPITargetsJSON) => {
    if (!tenantId) throw new Error('No tenant ID');
    const { data: team, error } = await supabase
      .from('deal_teams')
      .select('id, kpi_targets')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !team) throw new Error('Brak zespołu sprzedażowego');

    const next = mutator((team.kpi_targets as KPITargetsJSON | null) || {});
    const { error: upErr } = await supabase
      .from('deal_teams')
      .update({ kpi_targets: next as never })
      .eq('id', team.id);
    if (upErr) throw upErr;
  };

  const upsertYearlyTarget = useMutation({
    mutationFn: async (input: Omit<CreateKPIInput, 'year' | 'month'>) => {
      await writeToFirstTeam((kpi) => {
        const next: KPITargetsJSON = { ...kpi, yearly: { ...(kpi.yearly || {}) } };
        const cur = next.yearly![String(year)] || {};
        next.yearly![String(year)] = {
          ...cur,
          target_premium: input.target_premium,
          target_commission: input.target_commission ?? cur.target_commission,
          target_commission_rate: input.target_commission_rate ?? cur.target_commission_rate,
        };
        return next;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] });
      toast.success('Cel roczny został zapisany');
    },
    onError: (e: Error) => toast.error(e.message || 'Nie udało się zapisać celu rocznego'),
  });

  const upsertMonthlyTarget = useMutation({
    mutationFn: async ({ month, ...input }: { month: number } & Omit<CreateKPIInput, 'year' | 'month'>) => {
      await writeToFirstTeam((kpi) => {
        const next: KPITargetsJSON = { ...kpi, yearly: { ...(kpi.yearly || {}) } };
        const cur = next.yearly![String(year)] || {};
        const monthly = { ...(cur.monthly || {}) };
        monthly[String(month)] = {
          target_premium: input.target_premium,
          target_commission: input.target_commission ?? null,
        };
        next.yearly![String(year)] = { ...cur, monthly };
        return next;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Nie udało się zapisać celu miesięcznego'),
  });

  const createTarget = useMutation({
    mutationFn: async (input: CreateKPIInput) => {
      if (input.month != null) {
        await upsertMonthlyTarget.mutateAsync({ month: input.month, target_premium: input.target_premium, target_commission: input.target_commission });
      } else {
        await upsertYearlyTarget.mutateAsync({ target_premium: input.target_premium, target_commission: input.target_commission, target_commission_rate: input.target_commission_rate });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] }),
  });

  const updateTarget = useMutation({
    mutationFn: async ({ id, ...input }: UpdateKPIInput) => {
      // id format: "tenant:year:month|null"
      const [, , monthStr] = id.split(':');
      const month = monthStr === 'null' ? null : Number(monthStr);
      if (month != null) {
        await upsertMonthlyTarget.mutateAsync({
          month,
          target_premium: input.target_premium ?? 0,
          target_commission: input.target_commission ?? null,
        });
      } else {
        await upsertYearlyTarget.mutateAsync({
          target_premium: input.target_premium ?? 0,
          target_commission: input.target_commission ?? null,
          target_commission_rate: input.target_commission_rate ?? null,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] }),
  });

  const deleteTarget = useMutation({
    mutationFn: async (targetId: string) => {
      const [, , monthStr] = targetId.split(':');
      const month = monthStr === 'null' ? null : Number(monthStr);
      await writeToFirstTeam((kpi) => {
        const next: KPITargetsJSON = { ...kpi, yearly: { ...(kpi.yearly || {}) } };
        const cur = next.yearly![String(year)];
        if (!cur) return next;
        if (month == null) {
          delete next.yearly![String(year)];
        } else if (cur.monthly) {
          const monthly = { ...cur.monthly };
          delete monthly[String(month)];
          next.yearly![String(year)] = { ...cur, monthly };
        }
        return next;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-kpi'] });
      toast.success('Cel KPI został usunięty');
    },
    onError: (e: Error) => toast.error(e.message || 'Nie udało się usunąć celu KPI'),
  });

  return {
    targets: targets || [],
    yearlyTarget,
    monthlyTargets,
    isLoading,
    error,
    createTarget,
    updateTarget,
    deleteTarget,
    upsertYearlyTarget,
    upsertMonthlyTarget,
  };
}
