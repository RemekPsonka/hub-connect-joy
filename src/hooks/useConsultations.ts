import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Consultation = Tables<'consultations'>;
export type ConsultationInsert = TablesInsert<'consultations'>;
export type ConsultationUpdate = TablesUpdate<'consultations'>;

export interface ConsultationWithContact extends Consultation {
  contacts: Tables<'contacts'>;
}

export interface ConsultationsFilters {
  status?: 'all' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useConsultations(filters: ConsultationsFilters = {}) {
  const { status = 'all', dateFrom, dateTo, search, page = 1, pageSize = 20 } = filters;

  return useQuery({
    queryKey: ['consultations', filters],
    queryFn: async () => {
      let query = supabase
        .from('consultations')
        .select(`
          *,
          contacts!inner (
            id,
            full_name,
            email,
            phone,
            company,
            position
          )
        `)
        .order('scheduled_at', { ascending: false });

      // Status filter
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      // Date range filter
      if (dateFrom) {
        query = query.gte('scheduled_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('scheduled_at', dateTo.toISOString());
      }

      // Search by contact name
      if (search) {
        query = query.ilike('contacts.full_name', `%${search}%`);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        consultations: data as ConsultationWithContact[],
        totalCount: count || 0,
        page,
        pageSize,
      };
    },
  });
}

export function useConsultation(id: string | undefined) {
  return useQuery({
    queryKey: ['consultation', id],
    queryFn: async () => {
      if (!id) throw new Error('Consultation ID is required');

      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          contacts (
            id,
            full_name,
            email,
            phone,
            company,
            position,
            linkedin_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data as ConsultationWithContact;
    },
    enabled: !!id,
  });
}

export function useUpcomingConsultations(limit = 5) {
  return useQuery({
    queryKey: ['consultations', 'upcoming', limit],
    queryFn: async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          contacts (
            id,
            full_name,
            company
          )
        `)
        .gte('scheduled_at', now)
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return data as ConsultationWithContact[];
    },
  });
}

export function useTodayConsultationsCount() {
  return useQuery({
    queryKey: ['consultations', 'today-count'],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const { count, error } = await supabase
        .from('consultations')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', startOfDay)
        .lt('scheduled_at', endOfDay)
        .eq('status', 'scheduled');

      if (error) throw error;

      return count || 0;
    },
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (consultation: ConsultationInsert) => {
      const { data, error } = await supabase
        .from('consultations')
        .insert(consultation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
    },
  });
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ConsultationUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('consultations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation', data.id] });
    },
  });
}

export function useDeleteConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('consultations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
    },
  });
}

export function useConsultationTasks(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation-tasks', consultationId],
    queryFn: async () => {
      if (!consultationId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!consultationId,
  });
}

export function useCreateConsultationTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      consultationId, 
      title, 
      contactId,
      tenantId 
    }: { 
      consultationId: string; 
      title: string; 
      contactId: string;
      tenantId: string;
    }) => {
      // First create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title,
          consultation_id: consultationId,
          tenant_id: tenantId,
          status: 'pending',
          priority: 'medium',
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Then link it to the contact
      const { error: linkError } = await supabase
        .from('task_contacts')
        .insert({
          task_id: task.id,
          contact_id: contactId,
          role: 'primary',
        });

      if (linkError) throw linkError;

      return task;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultation-tasks', variables.consultationId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useContactConsultationsHistory(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-consultations', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('contact_id', contactId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
}
