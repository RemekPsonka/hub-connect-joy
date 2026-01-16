import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { generateEmbeddingInBackground } from './useEmbeddings';

export type Contact = Tables<'contacts'>;
export type ContactInsert = TablesInsert<'contacts'>;
export type ContactUpdate = TablesUpdate<'contacts'>;
export type ContactGroup = Tables<'contact_groups'>;

export interface ContactsFilters {
  search?: string;
  groupId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactWithGroup extends Contact {
  contact_groups: ContactGroup | null;
}

export function useContacts(filters: ContactsFilters = {}) {
  const { director } = useAuth();
  const {
    search = '',
    groupId = '',
    page = 1,
    pageSize = 20,
    sortBy = 'full_name',
    sortOrder = 'asc',
  } = filters;

  return useQuery({
    queryKey: ['contacts', director?.tenant_id, search, groupId, page, pageSize, sortBy, sortOrder],
    queryFn: async () => {
      if (!director?.tenant_id) return { data: [], count: 0 };

      let query = supabase
        .from('contacts')
        .select('*, contact_groups(*)', { count: 'exact' })
        .eq('tenant_id', director.tenant_id)
        .eq('is_active', true);

      // Search filter
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Group filter
      if (groupId) {
        query = query.eq('primary_group_id', groupId);
      }

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return { data: data as ContactWithGroup[], count: count || 0 };
    },
    enabled: !!director?.tenant_id,
  });
}

export function useContact(id: string | undefined) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      if (!id || !director?.tenant_id) return null;

      const { data, error } = await supabase
        .from('contacts')
        .select('*, contact_groups(*)')
        .eq('id', id)
        .eq('tenant_id', director.tenant_id)
        .single();

      if (error) throw error;

      return data as ContactWithGroup;
    },
    enabled: !!id && !!director?.tenant_id,
  });
}

export function useContactGroups() {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['contact_groups', director?.tenant_id],
    queryFn: async () => {
      if (!director?.tenant_id) return [];

      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('tenant_id', director.tenant_id)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data as ContactGroup[];
    },
    enabled: !!director?.tenant_id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (contact: Omit<ContactInsert, 'tenant_id'>) => {
      if (!director?.tenant_id) throw new Error('Brak tenant_id');

      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contact, tenant_id: director.tenant_id })
        .select('*, contact_groups(*)')
        .single();

      if (error) throw error;

      return data as ContactWithGroup;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Kontakt został dodany');
      
      // Generate embedding in background
      generateEmbeddingInBackground('contact', data.id);
    },
    onError: (error) => {
      console.error('Error creating contact:', error);
      toast.error('Nie udało się dodać kontaktu');
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select('*, contact_groups(*)')
        .single();

      if (error) throw error;

      return data as ContactWithGroup;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
      
      // Regenerate embedding in background
      generateEmbeddingInBackground('contact', data.id);
      toast.success('Kontakt został zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating contact:', error);
      toast.error('Nie udało się zaktualizować kontaktu');
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from('contacts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Kontakt został usunięty');
    },
    onError: (error) => {
      console.error('Error deleting contact:', error);
      toast.error('Nie udało się usunąć kontaktu');
    },
  });
}

export function useBulkUpdateContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: ContactUpdate }) => {
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .in('id', ids);

      if (error) throw error;

      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Kontakty zostały zaktualizowane');
    },
    onError: (error) => {
      console.error('Error bulk updating contacts:', error);
      toast.error('Nie udało się zaktualizować kontaktów');
    },
  });
}

export function useBulkDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from('contacts')
        .update({ is_active: false })
        .in('id', ids);

      if (error) throw error;

      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Kontakty zostały usunięte');
    },
    onError: (error) => {
      console.error('Error bulk deleting contacts:', error);
      toast.error('Nie udało się usunąć kontaktów');
    },
  });
}

// Stats hooks for contact detail
export function useContactStats(contactId: string | undefined) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['contact_stats', contactId],
    queryFn: async () => {
      if (!contactId || !director?.tenant_id) return { needs: 0, offers: 0, tasks: 0 };

      const [needsResult, offersResult, tasksResult] = await Promise.all([
        supabase
          .from('needs')
          .select('id', { count: 'exact', head: true })
          .eq('contact_id', contactId)
          .eq('status', 'active'),
        supabase
          .from('offers')
          .select('id', { count: 'exact', head: true })
          .eq('contact_id', contactId)
          .eq('status', 'active'),
        supabase
          .from('task_contacts')
          .select('task_id, tasks!inner(status)', { count: 'exact', head: true })
          .eq('contact_id', contactId)
          .eq('tasks.status', 'pending'),
      ]);

      return {
        needs: needsResult.count || 0,
        offers: offersResult.count || 0,
        tasks: tasksResult.count || 0,
      };
    },
    enabled: !!contactId && !!director?.tenant_id,
  });
}

export function useContactConsultations(contactId: string | undefined) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['contact_consultations', contactId],
    queryFn: async () => {
      if (!contactId || !director?.tenant_id) return [];

      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('contact_id', contactId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      return data;
    },
    enabled: !!contactId && !!director?.tenant_id,
  });
}

export function useContactTasks(contactId: string | undefined) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['contact_tasks', contactId],
    queryFn: async () => {
      if (!contactId || !director?.tenant_id) return [];

      const { data, error } = await supabase
        .from('task_contacts')
        .select('*, tasks(*)')
        .eq('contact_id', contactId);

      if (error) throw error;

      return data;
    },
    enabled: !!contactId && !!director?.tenant_id,
  });
}

export function useContactNeeds(contactId: string | undefined) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['contact_needs', contactId],
    queryFn: async () => {
      if (!contactId || !director?.tenant_id) return [];

      const { data, error } = await supabase
        .from('needs')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    },
    enabled: !!contactId && !!director?.tenant_id,
  });
}

export function useContactOffers(contactId: string | undefined) {
  const { director } = useAuth();

  return useQuery({
    queryKey: ['contact_offers', contactId],
    queryFn: async () => {
      if (!contactId || !director?.tenant_id) return [];

      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    },
    enabled: !!contactId && !!director?.tenant_id,
  });
}
