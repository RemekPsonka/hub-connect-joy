import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  created_at: string;
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface CreateTenantData {
  tenantName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFullName: string;
}

interface UpdateTenantData {
  tenantId: string;
  tenantName: string;
  ownerId?: string;
  ownerFullName?: string;
  ownerEmail?: string;
  ownerPassword?: string;
}

export function useSuperadmin() {
  const queryClient = useQueryClient();
  const { user, director } = useAuth();

  // Check if current user is a superadmin
  const { data: isSuperadmin, isLoading: isCheckingRole } = useQuery({
    queryKey: ['is-superadmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('superadmins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking superadmin status:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch current user's tenant name
  const { data: currentTenantName } = useQuery({
    queryKey: ['current-tenant-name', director?.tenant_id],
    queryFn: async () => {
      if (!director?.tenant_id) return null;
      
      const { data, error } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', director.tenant_id)
        .single();
      
      if (error) {
        console.error('Error fetching tenant name:', error);
        return null;
      }
      
      return data.name;
    },
    enabled: !!director?.tenant_id,
  });

  // Fetch all tenants with their owners
  const { data: tenants, isLoading: isLoadingTenants, refetch: refetchTenants } = useQuery({
    queryKey: ['all-tenants'],
    queryFn: async () => {
      // First get all tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (tenantsError) {
        console.error('Error fetching tenants:', tenantsError);
        throw tenantsError;
      }

      // Then get all directors with owner role
      const { data: directorsData, error: directorsError } = await supabase
        .from('directors')
        .select('id, tenant_id, full_name, email, role')
        .eq('role', 'owner');

      if (directorsError) {
        console.error('Error fetching directors:', directorsError);
        throw directorsError;
      }

      // Combine the data
      const tenantsWithOwners: Tenant[] = tenantsData.map(tenant => {
        const owner = directorsData.find(d => d.tenant_id === tenant.id);
        return {
          ...tenant,
          owner: owner ? {
            id: owner.id,
            full_name: owner.full_name,
            email: owner.email
          } : undefined
        };
      });

      return tenantsWithOwners;
    },
    enabled: !!isSuperadmin,
  });

  // Create new tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: CreateTenantData) => {
      const { data: result, error } = await supabase.functions.invoke('create-new-tenant', {
        body: data
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: () => {
      toast.success('Organizacja została utworzona');
      queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
    },
    onError: (error: Error) => {
      toast.error('Błąd tworzenia organizacji: ' + error.message);
    }
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async (data: UpdateTenantData) => {
      // Update tenant name
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ name: data.tenantName })
        .eq('id', data.tenantId);

      if (tenantError) throw tenantError;

      // Update owner data if owner exists
      if (data.ownerId) {
        // Update directors table
        const directorUpdate: { full_name?: string; email?: string } = {};
        if (data.ownerFullName) directorUpdate.full_name = data.ownerFullName;
        if (data.ownerEmail) directorUpdate.email = data.ownerEmail;

        if (Object.keys(directorUpdate).length > 0) {
          const { error: directorError } = await supabase
            .from('directors')
            .update(directorUpdate)
            .eq('id', data.ownerId);

          if (directorError) throw directorError;
        }

        // Update auth.users via edge function if email or password changed
        if (data.ownerEmail || data.ownerPassword) {
          // Get the user_id from director
          const { data: director, error: fetchError } = await supabase
            .from('directors')
            .select('user_id')
            .eq('id', data.ownerId)
            .single();

          if (fetchError) throw fetchError;

          const { data: result, error: fnError } = await supabase.functions.invoke('update-tenant-user', {
            body: {
              userId: director.user_id,
              email: data.ownerEmail,
              password: data.ownerPassword,
              tenantId: data.tenantId,
            }
          });

          if (fnError) throw fnError;
          if (result?.error) throw new Error(result.error);
        }
      }
    },
    onSuccess: () => {
      toast.success('Organizacja została zaktualizowana');
      queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
    },
    onError: (error: Error) => {
      toast.error('Błąd aktualizacji organizacji: ' + error.message);
    }
  });

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      // First delete all directors in this tenant
      const { error: directorsError } = await supabase
        .from('directors')
        .delete()
        .eq('tenant_id', tenantId);

      if (directorsError) throw directorsError;

      // Then delete the tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (tenantError) throw tenantError;
    },
    onSuccess: () => {
      toast.success('Organizacja została usunięta');
      queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
    },
    onError: (error: Error) => {
      toast.error('Błąd usuwania organizacji: ' + error.message);
    }
  });

  return {
    isSuperadmin: !!isSuperadmin,
    isCheckingRole,
    currentUserName: director?.full_name || null,
    currentTenantName: currentTenantName || null,
    tenants: tenants || [],
    isLoadingTenants,
    refetchTenants,
    createTenant: createTenantMutation.mutate,
    isCreatingTenant: createTenantMutation.isPending,
    updateTenant: updateTenantMutation.mutate,
    isUpdatingTenant: updateTenantMutation.isPending,
    deleteTenant: deleteTenantMutation.mutate,
    isDeletingTenant: deleteTenantMutation.isPending,
  };
}
