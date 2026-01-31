import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SalesRepresentative {
  id: string;
  user_id: string;
  parent_director_id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRepresentativeInput {
  full_name: string;
  email: string;
  role_type: 'sales_rep' | 'ambassador';
  password: string;
}

export interface UpdateRepresentativeInput {
  id: string;
  full_name?: string;
  role_type?: 'sales_rep' | 'ambassador';
  is_active?: boolean;
}

export function useRepresentatives() {
  const { director } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const { data: representatives, isLoading, error } = useQuery({
    queryKey: ['sales-representatives', director?.tenant_id],
    queryFn: async (): Promise<SalesRepresentative[]> => {
      const { data, error } = await supabase
        .from('sales_representatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!director?.tenant_id,
  });

  const createRepresentative = useMutation({
    mutationFn: async (input: CreateRepresentativeInput) => {
      if (!director?.tenant_id || !director?.id) {
        throw new Error('Brak danych dyrektora');
      }

      setIsCreating(true);

      try {
        // 1. Create user account via edge function
        const { data: userData, error: userError } = await supabase.functions.invoke('create-tenant-user', {
          body: {
            email: input.email,
            password: input.password,
            full_name: input.full_name,
            role: 'sales_rep',
            tenant_id: director.tenant_id,
          }
        });

        if (userError) throw userError;

        // 2. Create sales_representatives record
        const { data, error } = await supabase
          .from('sales_representatives')
          .insert({
            user_id: userData.user_id,
            parent_director_id: director.id,
            tenant_id: director.tenant_id,
            full_name: input.full_name,
            email: input.email,
            role_type: input.role_type,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } finally {
        setIsCreating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-representatives'] });
      toast.success('Przedstawiciel został dodany');
    },
    onError: (error) => {
      console.error('Error creating representative:', error);
      toast.error('Nie udało się dodać przedstawiciela');
    },
  });

  const updateRepresentative = useMutation({
    mutationFn: async (input: UpdateRepresentativeInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('sales_representatives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-representatives'] });
      toast.success('Przedstawiciel został zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating representative:', error);
      toast.error('Nie udało się zaktualizować przedstawiciela');
    },
  });

  const deleteRepresentative = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_representatives')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-representatives'] });
      toast.success('Przedstawiciel został usunięty');
    },
    onError: (error) => {
      console.error('Error deleting representative:', error);
      toast.error('Nie udało się usunąć przedstawiciela');
    },
  });

  return {
    representatives,
    isLoading,
    error,
    isCreating,
    createRepresentative,
    updateRepresentative,
    deleteRepresentative,
  };
}
