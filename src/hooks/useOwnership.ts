import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Helper to get tenant ID from auth context
function useTenantId() {
  const { director, assistant } = useAuth();
  return director?.tenant_id || assistant?.tenant_id;
}

interface OwnershipStake {
  id: string;
  contact_id: string;
  company_id: string;
  ownership_percent: number | null;
  role: string | null;
  added_by: string | null;
  revenue_share: number | null;
  notes: string | null;
  created_at: string;
  tenant_id: string;
  company?: {
    id: string;
    name: string;
    revenue_amount: number | null;
    revenue_currency: string | null;
    revenue_year: number | null;
    logo_url: string | null;
  };
}

interface OwnershipWithContact extends OwnershipStake {
  contact?: {
    id: string;
    full_name: string;
    position: string | null;
    email: string | null;
  };
}

// Get all ownerships for a contact (owner)
export function useContactOwnerships(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact_ownerships', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('ownership_stakes')
        .select(`
          *,
          company:companies(id, name, revenue_amount, revenue_currency, revenue_year, logo_url)
        `)
        .eq('contact_id', contactId)
        .order('ownership_percent', { ascending: false });

      if (error) throw error;
      return data as OwnershipStake[];
    },
    enabled: !!contactId,
  });
}

// Get all owners of a company
export function useCompanyOwners(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company_owners', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('ownership_stakes')
        .select(`
          *,
          contact:contacts(id, full_name, position, email)
        `)
        .eq('company_id', companyId)
        .order('ownership_percent', { ascending: false });

      if (error) throw error;
      return data as OwnershipWithContact[];
    },
    enabled: !!companyId,
  });
}

// Calculate total ownership revenue for a contact
export function useOwnerTotalRevenue(contactId: string | undefined) {
  const { data: ownerships } = useContactOwnerships(contactId);

  const totalRevenue = ownerships?.reduce((sum, ownership) => {
    if (!ownership.company?.revenue_amount || !ownership.ownership_percent) return sum;
    const share = (ownership.company.revenue_amount * ownership.ownership_percent) / 100;
    return sum + share;
  }, 0) || 0;

  const revenueDetails = ownerships?.map(ownership => ({
    companyName: ownership.company?.name || 'Nieznana firma',
    companyId: ownership.company_id,
    ownershipPercent: ownership.ownership_percent || 0,
    companyRevenue: ownership.company?.revenue_amount || 0,
    revenueShare: ownership.company?.revenue_amount && ownership.ownership_percent
      ? (ownership.company.revenue_amount * ownership.ownership_percent) / 100
      : 0,
    currency: ownership.company?.revenue_currency || 'PLN',
    year: ownership.company?.revenue_year,
  })) || [];

  return {
    totalRevenue,
    revenueDetails,
    currency: revenueDetails[0]?.currency || 'PLN',
  };
}

// Add ownership stake
export function useAddOwnership() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  return useMutation({
    mutationFn: async ({
      contactId,
      companyId,
      ownershipPercent,
      role = 'owner',
      addedBy = 'manual',
      notes,
    }: {
      contactId: string;
      companyId: string;
      ownershipPercent?: number;
      role?: string;
      addedBy?: string;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('ownership_stakes')
        .insert({
          contact_id: contactId,
          company_id: companyId,
          ownership_percent: ownershipPercent,
          role,
          added_by: addedBy,
          notes,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact_ownerships', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['company_owners', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
      toast.success('Dodano udział w firmie');
    },
    onError: (error: any) => {
      console.error('Error adding ownership:', error);
      if (error.code === '23505') {
        toast.error('Ten udział już istnieje');
      } else {
        toast.error('Błąd podczas dodawania udziału');
      }
    },
  });
}

// Update ownership stake
export function useUpdateOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ownershipPercent,
      role,
      notes,
    }: {
      id: string;
      ownershipPercent?: number;
      role?: string;
      notes?: string;
    }) => {
      const updates: any = {};
      if (ownershipPercent !== undefined) updates.ownership_percent = ownershipPercent;
      if (role !== undefined) updates.role = role;
      if (notes !== undefined) updates.notes = notes;

      const { data, error } = await supabase
        .from('ownership_stakes')
        .update(updates)
        .eq('id', id)
        .select('*, contact_id, company_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact_ownerships', data.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['company_owners', data.company_id] });
      toast.success('Zaktualizowano udział');
    },
    onError: (error) => {
      console.error('Error updating ownership:', error);
      toast.error('Błąd podczas aktualizacji udziału');
    },
  });
}

// Remove ownership stake
export function useRemoveOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId, companyId }: { id: string; contactId: string; companyId: string }) => {
      const { error } = await supabase
        .from('ownership_stakes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { contactId, companyId };
    },
    onSuccess: ({ contactId, companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['contact_ownerships', contactId] });
      queryClient.invalidateQueries({ queryKey: ['company_owners', companyId] });
      toast.success('Usunięto udział w firmie');
    },
    onError: (error) => {
      console.error('Error removing ownership:', error);
      toast.error('Błąd podczas usuwania udziału');
    },
  });
}

// Toggle owner status on contact
export function useToggleOwnerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, isOwner }: { contactId: string; isOwner: boolean }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update({ is_owner: isOwner })
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(data.is_owner ? 'Oznaczono jako właściciela' : 'Usunięto status właściciela');
    },
    onError: (error) => {
      console.error('Error toggling owner status:', error);
      toast.error('Błąd podczas zmiany statusu właściciela');
    },
  });
}

// Update total ownership revenue for a contact
export function useUpdateOwnerRevenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, totalRevenue }: { contactId: string; totalRevenue: number }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update({ total_ownership_revenue: totalRevenue })
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
    },
  });
}
