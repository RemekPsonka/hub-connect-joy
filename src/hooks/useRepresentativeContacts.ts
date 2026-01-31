import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

export interface RepresentativeContact {
  id: string;
  representative_id: string;
  contact_id: string;
  assigned_by: string | null;
  assigned_at: string;
  status: string;
  deadline_days: number;
  deadline_at: string | null;
  extended_count: number;
  notes: string | null;
  completed_at: string | null;
  // Joined data
  contact?: {
    id: string;
    full_name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
  };
  representative?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface AssignContactInput {
  representative_id: string;
  contact_id: string;
  deadline_days?: number;
  notes?: string;
}

export interface UpdateAssignmentInput {
  id: string;
  status?: string;
  notes?: string;
  extended_count?: number;
  deadline_at?: string;
}

export function useRepresentativeContacts(representativeId?: string) {
  const { director } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all assignments (for directors)
  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['representative-contacts', director?.tenant_id, representativeId],
    queryFn: async (): Promise<RepresentativeContact[]> => {
      let query = supabase
        .from('representative_contacts')
        .select(`
          *,
          contact:contacts(id, full_name, company, email, phone),
          representative:sales_representatives(id, full_name, email)
        `)
        .order('assigned_at', { ascending: false });

      if (representativeId) {
        query = query.eq('representative_id', representativeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!director?.tenant_id,
  });

  // Assign contact to representative
  const assignContact = useMutation({
    mutationFn: async (input: AssignContactInput) => {
      if (!director?.id) throw new Error('Brak danych dyrektora');

      const deadlineDays = input.deadline_days || 14;
      const deadlineAt = addDays(new Date(), deadlineDays).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('representative_contacts')
        .insert({
          representative_id: input.representative_id,
          contact_id: input.contact_id,
          assigned_by: director.id,
          deadline_days: deadlineDays,
          deadline_at: deadlineAt,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Create task for the representative
      await supabase
        .from('tasks')
        .insert({
          tenant_id: director.tenant_id,
          owner_id: director.id,
          title: `Umów spotkanie z kontaktem`,
          description: `Przypisano kontakt do obsługi. Termin: ${deadlineDays} dni.`,
          priority: 'high',
          status: 'pending',
          due_date: deadlineAt,
          contact_id: input.contact_id,
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representative-contacts'] });
      toast.success('Kontakt został przekazany przedstawicielowi');
    },
    onError: (error) => {
      console.error('Error assigning contact:', error);
      toast.error('Nie udało się przekazać kontaktu');
    },
  });

  // Update assignment (status, extend deadline, etc.)
  const updateAssignment = useMutation({
    mutationFn: async (input: UpdateAssignmentInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('representative_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representative-contacts'] });
      toast.success('Przypisanie zostało zaktualizowane');
    },
    onError: (error) => {
      console.error('Error updating assignment:', error);
      toast.error('Nie udało się zaktualizować przypisania');
    },
  });

  // Reclaim contact from representative
  const reclaimContact = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('representative_contacts')
        .update({ status: 'reclaimed' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representative-contacts'] });
      toast.success('Kontakt został odebrany');
    },
    onError: (error) => {
      console.error('Error reclaiming contact:', error);
      toast.error('Nie udało się odebrać kontaktu');
    },
  });

  // Extend deadline
  const extendDeadline = useMutation({
    mutationFn: async ({ id, additionalDays }: { id: string; additionalDays: number }) => {
      // First get current assignment
      const { data: current, error: fetchError } = await supabase
        .from('representative_contacts')
        .select('deadline_at, extended_count')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentDeadline = current.deadline_at ? new Date(current.deadline_at) : new Date();
      const newDeadline = addDays(currentDeadline, additionalDays).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('representative_contacts')
        .update({
          deadline_at: newDeadline,
          extended_count: (current.extended_count || 0) + 1,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['representative-contacts'] });
      toast.success('Termin został przedłużony');
    },
    onError: (error) => {
      console.error('Error extending deadline:', error);
      toast.error('Nie udało się przedłużyć terminu');
    },
  });

  return {
    assignments,
    isLoading,
    error,
    assignContact,
    updateAssignment,
    reclaimContact,
    extendDeadline,
  };
}
