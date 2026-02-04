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
export type Company = Tables<'companies'>;

export interface ContactsFilters {
  search?: string;
  groupId?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactWithGroup extends Contact {
  contact_groups: ContactGroup | null;
}

export interface ContactWithDetails extends Contact {
  contact_groups: ContactGroup | null;
  companies: Company | null;
}

export function useContacts(filters: ContactsFilters = {}) {
  const { director, assistant, isAssistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  
  const {
    search = '',
    groupId = '',
    companyId = '',
    page = 1,
    pageSize = 20,
    sortBy = 'full_name',
    sortOrder = 'asc',
  } = filters;

  return useQuery({
    queryKey: ['contacts', tenantId, isAssistant, assistant?.allowed_group_ids, search, groupId, companyId, page, pageSize, sortBy, sortOrder],
    queryFn: async () => {
      if (!tenantId) return { data: [], count: 0 };

      let query = supabase
        .from('contacts')
        .select('*, contact_groups(*)', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      // For assistants, filter by allowed groups
      if (isAssistant && assistant?.allowed_group_ids?.length) {
        query = query.in('primary_group_id', assistant.allowed_group_ids);
      }

      // Search filter
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Group filter
      if (groupId) {
        query = query.eq('primary_group_id', groupId);
      }

      // Company filter
      if (companyId) {
        query = query.eq('company_id', companyId);
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
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 sekund
  });
}

export function useContact(id: string | undefined) {
  const { director, assistant, isAssistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      if (!id || !tenantId) return null;

      // For assistants, verify access to contact's group
      if (isAssistant && assistant?.allowed_group_ids?.length) {
        const { data, error } = await supabase
          .from('contacts')
          .select('*, contact_groups(*), companies(*)')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .in('primary_group_id', assistant.allowed_group_ids)
          .single();

        if (error) throw error;
        return data as ContactWithDetails;
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*, contact_groups(*), companies(*)')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return data as ContactWithDetails;
    },
    enabled: !!id && !!tenantId,
    staleTime: 30 * 1000, // 30 sekund
  });
}

export function useContactGroups() {
  const { director, assistant, isAssistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['contact_groups', tenantId, isAssistant, assistant?.allowed_group_ids],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('contact_groups')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });

      // For assistants, only show allowed groups
      if (isAssistant && assistant?.allowed_group_ids?.length) {
        query = query.in('id', assistant.allowed_group_ids);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as ContactGroup[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { director, assistant, isAssistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async (contact: Omit<ContactInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      // Walidacja dla asystentów - mogą tworzyć tylko w dozwolonych grupach
      if (isAssistant && contact.primary_group_id) {
        if (!assistant?.allowed_group_ids?.includes(contact.primary_group_id)) {
          throw new Error('Nie masz uprawnień do tworzenia kontaktów w tej grupie');
        }
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contact, tenant_id: tenantId })
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
    mutationFn: async ({ id, silent, ...updates }: ContactUpdate & { id: string; silent?: boolean }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select('*, contact_groups(*)')
        .single();

      if (error) throw error;

      return { data: data as ContactWithGroup, silent };
    },
    onSuccess: ({ data, silent }) => {
      if (!silent) {
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
        
        // Regenerate embedding in background
        generateEmbeddingInBackground('contact', data.id);
        toast.success('Kontakt został zaktualizowany');
      } else {
        // Optymistyczna aktualizacja cache bez invalidacji
        queryClient.setQueryData(['contact', data.id], (old: ContactWithDetails | undefined) => {
          if (old) {
            return { ...old, ...data };
          }
          return old;
        });
      }
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
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['contact_stats', contactId],
    queryFn: async () => {
      if (!contactId || !tenantId) return { needs: 0, offers: 0, tasks: 0 };

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
    enabled: !!contactId && !!tenantId,
    staleTime: 30 * 1000, // 30 sekund
  });
}

export function useContactConsultations(contactId: string | undefined) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['contact_consultations', contactId],
    queryFn: async () => {
      if (!contactId || !tenantId) return [];

      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('contact_id', contactId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      return data;
    },
    enabled: !!contactId && !!tenantId,
    staleTime: 30 * 1000, // 30 sekund
  });
}

export function useContactTasks(contactId: string | undefined) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['contact_tasks', contactId],
    queryFn: async () => {
      if (!contactId || !tenantId) return [];

      const { data, error } = await supabase
        .from('task_contacts')
        .select('*, tasks(*)')
        .eq('contact_id', contactId);

      if (error) throw error;

      return data;
    },
    enabled: !!contactId && !!tenantId,
    staleTime: 15 * 1000, // 15 sekund
  });
}

export function useContactNeeds(contactId: string | undefined) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['contact_needs', contactId],
    queryFn: async () => {
      if (!contactId || !tenantId) return [];

      const { data, error } = await supabase
        .from('needs')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    },
    enabled: !!contactId && !!tenantId,
    staleTime: 30 * 1000, // 30 sekund
  });
}

export function useContactOffers(contactId: string | undefined) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['contact_offers', contactId],
    queryFn: async () => {
      if (!contactId || !tenantId) return [];

      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    },
    enabled: !!contactId && !!tenantId,
    staleTime: 30 * 1000, // 30 sekund
  });
}

export function useGenerateContactProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-contact-profile', {
        body: { contact_id: contactId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return { 
        contactId, 
        profileSummary: data.profile_summary,
        company: data.company
      };
    },
    onSuccess: ({ contactId, company }) => {
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact_activity_log', contactId] });
      
      // Invalidate companies queries if company was created or updated
      if (company?.created || company?.updated) {
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        queryClient.invalidateQueries({ queryKey: ['company'] });
      }
      
      if (company?.created) {
        toast.success('Profil AI wygenerowany i firma utworzona');
      } else {
        toast.success('Profil AI został wygenerowany');
      }
    },
    onError: (error) => {
      console.error('Error generating contact profile:', error);
      toast.error(error instanceof Error ? error.message : 'Błąd podczas generowania profilu AI');
    },
  });
}

// Activity log types
export interface ContactActivityLog {
  id: string;
  tenant_id: string;
  contact_id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useContactActivityLog(contactId: string | undefined) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useQuery({
    queryKey: ['contact_activity_log', contactId],
    queryFn: async () => {
      if (!contactId || !tenantId) return [];

      const { data, error } = await supabase
        .from('contact_activity_log')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as ContactActivityLog[];
    },
    enabled: !!contactId && !!tenantId,
    staleTime: 30 * 1000, // 30 sekund
  });
}
