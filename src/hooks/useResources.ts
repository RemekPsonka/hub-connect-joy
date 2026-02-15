import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useInstitutions() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['resource-institutions', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_institutions')
        .select(`
          *,
          entries:resource_entries(
            *,
            connectors:resource_connectors(
              *,
              contact:contacts(id, full_name, company, position)
            )
          )
        `)
        .eq('tenant_id', tenantId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateInstitution() {
  const qc = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (values: { name: string; category: string; description?: string }) => {
      const { error } = await supabase.from('resource_institutions').insert({
        ...values,
        tenant_id: director!.tenant_id,
        created_by: director!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-institutions'] });
      toast.success('Instytucja dodana');
    },
    onError: () => toast.error('Nie udało się dodać instytucji'),
  });
}

export function useDeleteInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('resource_institutions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-institutions'] });
      toast.success('Instytucja usunięta');
    },
  });
}

export function useCreateResourceEntry() {
  const qc = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (values: { institution_id: string; title: string; person_name?: string; person_position?: string; notes?: string; importance?: string }) => {
      const { error } = await supabase.from('resource_entries').insert({
        ...values,
        tenant_id: director!.tenant_id,
        created_by: director!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-institutions'] });
      toast.success('Zasób dodany');
    },
    onError: () => toast.error('Nie udało się dodać zasobu'),
  });
}

export function useDeleteResourceEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('resource_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-institutions'] });
      toast.success('Zasób usunięty');
    },
  });
}

export function useCreateConnector() {
  const qc = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (values: { resource_entry_id: string; contact_id: string; relationship_description?: string; strength?: string }) => {
      const { error } = await supabase.from('resource_connectors').insert({
        ...values,
        tenant_id: director!.tenant_id,
        created_by: director!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-institutions'] });
      toast.success('Połączenie dodane');
    },
    onError: () => toast.error('Nie udało się dodać połączenia'),
  });
}

export function useDeleteConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('resource_connectors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-institutions'] });
      toast.success('Połączenie usunięte');
    },
  });
}
