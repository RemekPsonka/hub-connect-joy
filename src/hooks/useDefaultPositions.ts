import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DefaultPosition {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

export function useDefaultPositions() {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['default-positions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('default_positions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching default positions:', error);
        throw error;
      }

      return data as DefaultPosition[];
    },
    enabled: !!tenantId
  });
}

export function useCreateDefaultPosition() {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!tenantId) throw new Error('No tenant ID');

      // Get max sort_order
      const { data: existing } = await supabase
        .from('default_positions')
        .select('sort_order')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.sort_order || 0;

      const { data, error } = await supabase
        .from('default_positions')
        .insert({
          tenant_id: tenantId,
          name,
          sort_order: maxOrder + 1,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-positions'] });
      toast.success('Dodano stanowisko');
    },
    onError: (error) => {
      console.error('Error creating position:', error);
      toast.error('Błąd podczas dodawania stanowiska');
    }
  });
}

export function useUpdateDefaultPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, is_default }: { id: string; name?: string; is_default?: boolean }) => {
      const updates: Partial<DefaultPosition> = {};
      if (name !== undefined) updates.name = name;
      if (is_default !== undefined) updates.is_default = is_default;

      const { data, error } = await supabase
        .from('default_positions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-positions'] });
    },
    onError: (error) => {
      console.error('Error updating position:', error);
      toast.error('Błąd podczas aktualizacji stanowiska');
    }
  });
}

export function useDeleteDefaultPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('default_positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-positions'] });
      toast.success('Usunięto stanowisko');
    },
    onError: (error) => {
      console.error('Error deleting position:', error);
      toast.error('Błąd podczas usuwania stanowiska');
    }
  });
}

export function useSetDefaultPosition() {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant ID');

      // First, set all positions to non-default
      await supabase
        .from('default_positions')
        .update({ is_default: false })
        .eq('tenant_id', tenantId);

      // Then set the selected one as default
      const { error } = await supabase
        .from('default_positions')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-positions'] });
      toast.success('Ustawiono domyślne stanowisko');
    },
    onError: (error) => {
      console.error('Error setting default position:', error);
      toast.error('Błąd podczas ustawiania domyślnego stanowiska');
    }
  });
}
