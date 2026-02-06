import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DealProduct {
  id: string;
  deal_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface DealProductInsert {
  deal_id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
}

export interface DealProductUpdate {
  id: string;
  name?: string;
  description?: string | null;
  quantity?: number;
  unit_price?: number;
}

export function useDealProducts(dealId: string | undefined) {
  return useQuery({
    queryKey: ['deal_products', dealId],
    queryFn: async () => {
      if (!dealId) return [];

      const { data, error } = await supabase
        .from('deal_products')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as DealProduct[];
    },
    enabled: !!dealId,
    staleTime: 30 * 1000,
  });
}

export function useCreateDealProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: DealProductInsert) => {
      const { data, error } = await supabase
        .from('deal_products')
        .insert({
          deal_id: product.deal_id,
          name: product.name,
          description: product.description,
          quantity: product.quantity,
          unit_price: product.unit_price,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DealProduct;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deal_products', data.deal_id] });
      toast.success('Produkt dodany');
    },
    onError: (error) => {
      console.error('Error creating deal product:', error);
      toast.error('Nie udało się dodać produktu');
    },
  });
}

export function useUpdateDealProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DealProductUpdate) => {
      const { data, error } = await supabase
        .from('deal_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DealProduct;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deal_products', data.deal_id] });
      toast.success('Produkt zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating deal product:', error);
      toast.error('Nie udało się zaktualizować produktu');
    },
  });
}

export function useDeleteDealProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the deal_id for cache invalidation
      const { data: product } = await supabase
        .from('deal_products')
        .select('deal_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('deal_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return product?.deal_id;
    },
    onSuccess: (dealId) => {
      if (dealId) {
        queryClient.invalidateQueries({ queryKey: ['deal_products', dealId] });
      }
      toast.success('Produkt usunięty');
    },
    onError: (error) => {
      console.error('Error deleting deal product:', error);
      toast.error('Nie udało się usunąć produktu');
    },
  });
}
