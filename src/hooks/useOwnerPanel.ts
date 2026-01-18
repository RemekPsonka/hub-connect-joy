import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AppRole = 'owner' | 'admin' | 'director' | 'viewer';

export interface TenantUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  roles: AppRole[];
}

export function useOwnerPanel() {
  const { director } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = director?.tenant_id;

  // Check if current user is tenant admin
  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ['is-tenant-admin', director?.user_id, tenantId],
    queryFn: async () => {
      if (!director?.user_id || !tenantId) return false;
      
      const { data, error } = await supabase.rpc('is_tenant_admin', {
        _user_id: director.user_id,
        _tenant_id: tenantId
      });
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      return data;
    },
    enabled: !!director?.user_id && !!tenantId,
  });

  // Fetch all users in tenant
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Fetch directors
      const { data: directors, error: directorsError } = await supabase
        .from('directors')
        .select('id, user_id, full_name, email, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });
      
      if (directorsError) throw directorsError;
      
      // Fetch roles for each user
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('tenant_id', tenantId);
      
      if (rolesError) throw rolesError;
      
      // Combine data
      const usersWithRoles: TenantUser[] = (directors || []).map(d => ({
        ...d,
        roles: (roles || [])
          .filter(r => r.user_id === d.user_id)
          .map(r => r.role as AppRole)
      }));
      
      return usersWithRoles;
    },
    enabled: !!tenantId && isAdmin === true,
  });

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      // Cannot change owner role
      const targetUser = users?.find(u => u.user_id === userId);
      if (targetUser?.roles.includes('owner')) {
        throw new Error('Nie można zmienić roli właściciela');
      }
      
      // Remove existing non-owner roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .neq('role', 'owner');
      
      if (deleteError) throw deleteError;
      
      // Add new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          role: newRole
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      toast.success('Rola zaktualizowana');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Błąd aktualizacji roli');
    }
  });

  // Remove user from tenant
  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      // Cannot remove owner
      const targetUser = users?.find(u => u.user_id === userId);
      if (targetUser?.roles.includes('owner')) {
        throw new Error('Nie można usunąć właściciela');
      }
      
      // Remove from user_roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);
      
      if (rolesError) throw rolesError;
      
      // Remove from directors
      const { error: directorsError } = await supabase
        .from('directors')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);
      
      if (directorsError) throw directorsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      toast.success('Użytkownik usunięty');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Błąd usuwania użytkownika');
    }
  });

  // Create new user
  const createUserMutation = useMutation({
    mutationFn: async ({ email, fullName, role }: { email: string; fullName: string; role: AppRole }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { data, error } = await supabase.functions.invoke('create-tenant-user', {
        body: { email, fullName, role, tenantId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      toast.success('Użytkownik utworzony');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Błąd tworzenia użytkownika');
    }
  });

  return {
    isAdmin,
    isAdminLoading,
    users: users || [],
    usersLoading,
    tenantId,
    updateRole: updateRoleMutation.mutate,
    isUpdatingRole: updateRoleMutation.isPending,
    removeUser: removeUserMutation.mutate,
    isRemovingUser: removeUserMutation.isPending,
    createUser: createUserMutation.mutateAsync,
    isCreatingUser: createUserMutation.isPending,
  };
}
