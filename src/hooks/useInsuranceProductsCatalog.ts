import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PolicyType } from '@/components/renewal/types';

export interface InsuranceProduct {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  default_commission_rate: number | null;
  is_active: boolean;
  created_at: string;
}

interface CreateProductInput {
  code: string;
  name: string;
  category: string;
  subcategory?: string | null;
  default_commission_rate?: number | null;
  is_active?: boolean;
}

interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

export const DEFAULT_COMMISSION_RATES: Record<PolicyType, number> = {
  property: 18,
  fleet: 8,
  do: 25,
  cyber: 20,
  liability: 12,
  life: 15,
  health: 10,
  other: 15,
};

export function useInsuranceProductsCatalog() {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['insurance-products', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_products')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as InsuranceProduct[];
    },
    enabled: !!tenantId,
  });

  const activeProducts = products?.filter(p => p.is_active) || [];

  const getProductsByCategory = (category: string) => {
    return (products || []).filter(p => p.category === category && p.is_active);
  };

  const createProduct = useMutation({
    mutationFn: async (input: CreateProductInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('insurance_products')
        .insert({
          ...input,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-products'] });
      toast.success('Produkt został dodany');
    },
    onError: (error) => {
      console.error('Error creating product:', error);
      toast.error('Nie udało się dodać produktu');
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...input }: UpdateProductInput) => {
      const { data, error } = await supabase
        .from('insurance_products')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-products'] });
      toast.success('Produkt został zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating product:', error);
      toast.error('Nie udało się zaktualizować produktu');
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('insurance_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-products'] });
      toast.success('Produkt został usunięty');
    },
    onError: (error) => {
      console.error('Error deleting product:', error);
      toast.error('Nie udało się usunąć produktu');
    },
  });

  return {
    products: products || [],
    activeProducts,
    isLoading,
    error,
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
