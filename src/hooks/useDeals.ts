import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface DealStage {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  position: number;
  color: string;
  probability_default: number;
  is_active: boolean;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  company_id: string | null;
  title: string;
  description: string | null;
  value: number;
  currency: string;
  stage_id: string;
  probability: number;
  expected_close_date: string | null;
  owner_id: string | null;
  source: string | null;
  status: 'open' | 'won' | 'lost';
  won_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  contact?: { id: string; full_name: string } | null;
  company?: { id: string; name: string } | null;
  stage?: DealStage | null;
  owner?: { id: string; full_name: string } | null;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  activity_type: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  details: Json | null;
  created_by: string | null;
  created_at: string;
  creator?: { id: string; full_name: string } | null;
}

export interface DealsFilters {
  search?: string;
  stageId?: string;
  status?: string;
  ownerId?: string;
  page?: number;
  pageSize?: number;
}

export interface DealInsert {
  title: string;
  contact_id?: string | null;
  company_id?: string | null;
  value?: number;
  currency?: string;
  stage_id: string;
  probability?: number;
  expected_close_date?: string | null;
  owner_id?: string | null;
  source?: string | null;
  description?: string | null;
}

export interface DealUpdate {
  title?: string;
  contact_id?: string | null;
  company_id?: string | null;
  value?: number;
  currency?: string;
  stage_id?: string;
  probability?: number;
  expected_close_date?: string | null;
  owner_id?: string | null;
  source?: string | null;
  description?: string | null;
  status?: 'open' | 'won' | 'lost';
  won_at?: string | null;
  lost_reason?: string | null;
}

export function useDealStages() {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['deal_stages', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('deal_stages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as DealStage[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeals(filters: DealsFilters = {}) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  const {
    search = '',
    stageId = '',
    status = '',
    ownerId = '',
    page = 1,
    pageSize = 20,
  } = filters;

  return useQuery({
    queryKey: ['deals', tenantId, search, stageId, status, ownerId, page, pageSize],
    queryFn: async () => {
      if (!tenantId) return { data: [], count: 0 };

      let query = supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(id, full_name),
          company:companies(id, name),
          stage:deal_stages(id, name, position, color, is_closed_won, is_closed_lost),
          owner:directors(id, full_name)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId);

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      if (stageId) {
        query = query.eq('stage_id', stageId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      query = query.order('created_at', { ascending: false });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return { data: data as Deal[], count: count || 0 };
    },
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });
}

export function useDeal(id: string | undefined) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['deal', id],
    queryFn: async () => {
      if (!id || !tenantId) return null;

      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(id, full_name, email, phone, company),
          company:companies(id, name),
          stage:deal_stages(id, name, position, color, is_closed_won, is_closed_lost),
          owner:directors(id, full_name)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data as Deal;
    },
    enabled: !!id && !!tenantId,
    staleTime: 30 * 1000,
  });
}

export function useDealActivities(dealId: string | undefined) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['deal_activities', dealId],
    queryFn: async () => {
      if (!dealId || !tenantId) return [];

      const { data, error } = await supabase
        .from('deal_activities')
        .select(`
          *,
          creator:directors(id, full_name)
        `)
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DealActivity[];
    },
    enabled: !!dealId && !!tenantId,
    staleTime: 30 * 1000,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async (deal: DealInsert) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      const { data, error } = await supabase
        .from('deals')
        .insert({ ...deal, tenant_id: tenantId })
        .select(`
          *,
          contact:contacts(id, full_name),
          company:companies(id, name),
          stage:deal_stages(id, name, position, color, is_closed_won, is_closed_lost),
          owner:directors(id, full_name)
        `)
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal został utworzony');
    },
    onError: (error) => {
      console.error('Error creating deal:', error);
      toast.error('Nie udało się utworzyć deal');
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DealUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          contact:contacts(id, full_name),
          company:companies(id, name),
          stage:deal_stages(id, name, position, color, is_closed_won, is_closed_lost),
          owner:directors(id, full_name)
        `)
        .single();

      if (error) throw error;
      return data as Deal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', data.id] });
      toast.success('Deal został zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating deal:', error);
      toast.error('Nie udało się zaktualizować deal');
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal został usunięty');
    },
    onError: (error) => {
      console.error('Error deleting deal:', error);
      toast.error('Nie udało się usunąć deal');
    },
  });
}

export function useCreateDealActivity() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (activity: {
      deal_id: string;
      activity_type: string;
      description?: string;
      old_value?: string;
      new_value?: string;
      details?: Json;
    }) => {
      const { data, error } = await supabase
        .from('deal_activities')
        .insert({
          deal_id: activity.deal_id,
          activity_type: activity.activity_type,
          description: activity.description ?? null,
          old_value: activity.old_value ?? null,
          new_value: activity.new_value ?? null,
          details: activity.details ?? null,
          created_by: director?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deal_activities', data.deal_id] });
    },
  });
}

export function useSeedDealStages() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('Brak tenant_id');

      const { data, error } = await supabase.rpc('seed_deal_stages_for_tenant', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal_stages'] });
      toast.success('Etapy pipeline zostały utworzone');
    },
    onError: (error) => {
      console.error('Error seeding deal stages:', error);
      toast.error('Nie udało się utworzyć etapów');
    },
  });
}
