import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProductCategory {
  id: string;
  team_id: string;
  tenant_id: string;
  name: string;
  color: string;
  default_commission_percent: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export function useProductCategories(teamId: string | undefined) {
  return useQuery({
    queryKey: ['product-categories', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await (supabase as any)
        .from('deal_team_product_categories')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as ProductCategory[];
    },
    enabled: !!teamId,
  });
}

export function useCreateProductCategory() {
  const qc = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async (input: { teamId: string; name: string; color: string; defaultCommissionPercent?: number }) => {
      if (!tenantId) throw new Error('Brak tenant_id');
      const { error } = await (supabase as any)
        .from('deal_team_product_categories')
        .insert({
          team_id: input.teamId,
          tenant_id: tenantId,
          name: input.name,
          color: input.color,
          default_commission_percent: input.defaultCommissionPercent || 0,
        });
      if (error) throw error;
      return { teamId: input.teamId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['product-categories', r.teamId] });
      toast.success('Grupa produktów dodana');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; teamId: string; name?: string; color?: string; defaultCommissionPercent?: number; isActive?: boolean }) => {
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.color !== undefined) updates.color = input.color;
      if (input.defaultCommissionPercent !== undefined) updates.default_commission_percent = input.defaultCommissionPercent;
      if (input.isActive !== undefined) updates.is_active = input.isActive;
      const { error } = await (supabase as any)
        .from('deal_team_product_categories')
        .update(updates)
        .eq('id', input.id);
      if (error) throw error;
      return { teamId: input.teamId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['product-categories', r.teamId] });
      toast.success('Grupa zaktualizowana');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
