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
}

export interface CreateRepresentativeResult {
  representative: {
    id: string;
    email: string;
    fullName: string;
    roleType: string;
  };
  tempPassword: string;
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

  const { data: representatives, isLoading, error } = useQuery({
    queryKey: ['sales-representatives', director?.tenant_id],
    queryFn: async (): Promise<SalesRepresentative[]> => {
      const { data, error } = await supabase
        .from('sales_representatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((d) => ({
        ...d,
        role_type: d.role_type ?? 'sales_rep',
        is_active: d.is_active ?? true,
        created_at: d.created_at ?? new Date().toISOString(),
        updated_at: d.updated_at ?? new Date().toISOString(),
      })) as SalesRepresentative[];
    },
    enabled: !!director?.tenant_id,
  });

  const createRepresentative = useMutation({
    mutationFn: async (input: CreateRepresentativeInput): Promise<CreateRepresentativeResult> => {
      if (!director?.tenant_id || !director?.id) {
        throw new Error('Brak danych dyrektora');
      }

      const { data, error } = await supabase.functions.invoke('create-representative', {
        body: {
          email: input.email,
          fullName: input.full_name,
          roleType: input.role_type,
          tenantId: director.tenant_id,
          parentDirectorId: director.id,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data as CreateRepresentativeResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-representatives'] });
      toast.success('Przedstawiciel został dodany');
    },
    onError: (error: Error) => {
      console.error('Error creating representative:', error);
      toast.error(`Nie udało się dodać przedstawiciela: ${error.message}`);
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
    isCreating: createRepresentative.isPending,
    createRepresentative,
    updateRepresentative,
    deleteRepresentative,
  };
}
