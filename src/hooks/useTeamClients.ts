import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DealTeamContact } from '@/types/dealTeam';

// ===== Types =====

export interface ClientProduct {
  id: string;
  team_id: string;
  team_contact_id: string;
  product_category_id: string;
  tenant_id: string;
  deal_value: number;
  expected_commission: number;
  commission_percent: number;
  probability_percent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  category_name?: string;
  category_color?: string;
}

export interface RevenueForecast {
  id: string;
  client_product_id: string;
  tenant_id: string;
  month_offset: number;
  month_date: string;
  amount: number;
  percentage: number;
}

// Category probability constants
export const CATEGORY_PROBABILITY: Record<string, number> = {
  hot: 80,
  top: 50,
  lead: 20,
  cold: 5,
  client: 100,
};

// ===== Queries =====

/** Fetch contacts with category='client' */
export function useTeamClients(teamId: string | undefined) {
  return useQuery({
    queryKey: ['deal-team-clients', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data: dealContacts, error } = await supabase
        .from('deal_team_contacts')
        .select('*')
        .eq('team_id', teamId)
        .eq('category', 'client' as any)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      if (!dealContacts?.length) return [];

      const contactIds = [...new Set(dealContacts.map((dc) => dc.contact_id))];
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name, company, position, email, phone, city, company_id')
        .in('id', contactIds);

      const contactMap = new Map(contacts?.map((c) => [c.id, c]) || []);
      return dealContacts
        .map((dc) => ({ ...dc, contact: contactMap.get(dc.contact_id) }))
        .filter((dc) => dc.contact !== undefined) as DealTeamContact[];
    },
    enabled: !!teamId,
  });
}

/** Fetch client products for a team_contact */
export function useClientProducts(teamContactId: string | undefined) {
  return useQuery({
    queryKey: ['client-products', teamContactId],
    queryFn: async () => {
      if (!teamContactId) return [];
      const { data, error } = await (supabase as any)
        .from('deal_team_client_products')
        .select('*, deal_team_product_categories(name, color)')
        .eq('team_contact_id', teamContactId)
        .order('created_at');
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        category_name: d.deal_team_product_categories?.name,
        category_color: d.deal_team_product_categories?.color,
      })) as ClientProduct[];
    },
    enabled: !!teamContactId,
  });
}

/** Fetch all client products for a team (for summary) */
export function useAllTeamClientProducts(teamId: string | undefined) {
  return useQuery({
    queryKey: ['all-client-products', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await (supabase as any)
        .from('deal_team_client_products')
        .select('*, deal_team_product_categories(name, color)')
        .eq('team_id', teamId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        category_name: d.deal_team_product_categories?.name,
        category_color: d.deal_team_product_categories?.color,
      })) as ClientProduct[];
    },
    enabled: !!teamId,
  });
}

/** Fetch revenue forecasts for a client product */
export function useRevenueForecast(clientProductId: string | undefined) {
  return useQuery({
    queryKey: ['revenue-forecast', clientProductId],
    queryFn: async () => {
      if (!clientProductId) return [];
      const { data, error } = await (supabase as any)
        .from('deal_team_revenue_forecasts')
        .select('*')
        .eq('client_product_id', clientProductId)
        .order('month_offset');
      if (error) throw error;
      return (data || []) as RevenueForecast[];
    },
    enabled: !!clientProductId,
  });
}

/** Fetch all forecasts for a team */
export function useAllTeamForecasts(teamId: string | undefined) {
  return useQuery({
    queryKey: ['all-team-forecasts', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await (supabase as any)
        .from('deal_team_revenue_forecasts')
        .select('*, deal_team_client_products!inner(team_id, team_contact_id, deal_team_product_categories(name, color))')
        .eq('deal_team_client_products.team_id', teamId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!teamId,
  });
}

// ===== Mutations =====

export function useAddClientProduct() {
  const qc = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async (input: {
      teamId: string;
      teamContactId: string;
      productCategoryId: string;
      dealValue: number;
      expectedCommission: number;
      commissionPercent: number;
      probabilityPercent: number;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error('Brak tenant_id');
      const { error } = await (supabase as any)
        .from('deal_team_client_products')
        .insert({
          team_id: input.teamId,
          team_contact_id: input.teamContactId,
          product_category_id: input.productCategoryId,
          tenant_id: tenantId,
          deal_value: input.dealValue,
          expected_commission: input.expectedCommission,
          commission_percent: input.commissionPercent,
          probability_percent: input.probabilityPercent,
          notes: input.notes || null,
        });
      if (error) throw error;
      return { teamContactId: input.teamContactId, teamId: input.teamId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['client-products', r.teamContactId] });
      qc.invalidateQueries({ queryKey: ['all-client-products', r.teamId] });
      toast.success('Produkt dodany');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateClientProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      teamContactId: string;
      teamId: string;
      dealValue?: number;
      expectedCommission?: number;
      commissionPercent?: number;
      probabilityPercent?: number;
      notes?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.dealValue !== undefined) updates.deal_value = input.dealValue;
      if (input.expectedCommission !== undefined) updates.expected_commission = input.expectedCommission;
      if (input.commissionPercent !== undefined) updates.commission_percent = input.commissionPercent;
      if (input.probabilityPercent !== undefined) updates.probability_percent = input.probabilityPercent;
      if (input.notes !== undefined) updates.notes = input.notes;
      const { error } = await (supabase as any)
        .from('deal_team_client_products')
        .update(updates)
        .eq('id', input.id);
      if (error) throw error;
      return { teamContactId: input.teamContactId, teamId: input.teamId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['client-products', r.teamContactId] });
      qc.invalidateQueries({ queryKey: ['all-client-products', r.teamId] });
      toast.success('Produkt zaktualizowany');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteClientProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; teamContactId: string; teamId: string }) => {
      const { error } = await (supabase as any)
        .from('deal_team_client_products')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
      return { teamContactId: input.teamContactId, teamId: input.teamId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['client-products', r.teamContactId] });
      qc.invalidateQueries({ queryKey: ['all-client-products', r.teamId] });
      toast.success('Produkt usunięty');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSaveRevenueForecast() {
  const qc = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async (input: {
      clientProductId: string;
      forecasts: { monthOffset: number; monthDate: string; amount: number; percentage: number }[];
    }) => {
      if (!tenantId) throw new Error('Brak tenant_id');
      // Delete existing forecasts first
      await (supabase as any)
        .from('deal_team_revenue_forecasts')
        .delete()
        .eq('client_product_id', input.clientProductId);

      // Insert new ones (only non-zero)
      const rows = input.forecasts
        .filter((f) => f.percentage > 0)
        .map((f) => ({
          client_product_id: input.clientProductId,
          tenant_id: tenantId,
          month_offset: f.monthOffset,
          month_date: f.monthDate,
          amount: f.amount,
          percentage: f.percentage,
        }));

      if (rows.length > 0) {
        const { error } = await (supabase as any)
          .from('deal_team_revenue_forecasts')
          .insert(rows);
        if (error) throw error;
      }
      return { clientProductId: input.clientProductId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['revenue-forecast', r.clientProductId] });
      qc.invalidateQueries({ queryKey: ['all-team-forecasts'] });
      toast.success('Prognoza zapisana');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Convert a lead to client (change category to 'client') */
export function useConvertToClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase
        .from('deal_team_contacts')
        .update({ category: 'client' as any, status: 'won' })
        .eq('id', id);
      if (error) throw error;
      return { teamId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['deal-team-contacts', r.teamId] });
      qc.invalidateQueries({ queryKey: ['deal-team-clients', r.teamId] });
      toast.success('Kontakt przeniesiony do Klientów');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
