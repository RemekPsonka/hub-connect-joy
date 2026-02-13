import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Unified interface mapping tasks table fields to deal team assignment context.
 * After consolidation, all deal team assignments live in the `tasks` table.
 */
export interface DealTeamAssignment {
  id: string;
  deal_team_contact_id: string | null;
  deal_team_id: string | null;
  tenant_id: string;
  assigned_to: string | null;
  owner_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string | null;
  priority: string | null;
  completed_at: string | null;
  created_at: string | null;
  // Enriched fields from joins
  contact_name?: string;
  contact_company?: string | null;
}

// Status mapping helpers
const toTaskStatus = (dealStatus: string): string => {
  switch (dealStatus) {
    case 'pending': return 'todo';
    case 'done': return 'completed';
    default: return dealStatus; // in_progress, cancelled stay the same
  }
};

const fromTaskStatus = (taskStatus: string): string => {
  switch (taskStatus) {
    case 'todo': return 'pending';
    case 'completed': return 'done';
    default: return taskStatus;
  }
};

export function useContactAssignments(teamContactId: string | undefined) {
  return useQuery({
    queryKey: ['deal-team-assignments', teamContactId],
    queryFn: async () => {
      if (!teamContactId) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('deal_team_contact_id', teamContactId)
        .order('status', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        status: fromTaskStatus(t.status || 'todo'),
      })) as DealTeamAssignment[];
    },
    enabled: !!teamContactId,
  });
}

interface CreateAssignmentParams {
  teamContactId: string;
  teamId: string;
  assignedTo: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: string;
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateAssignmentParams) => {
      if (!director?.id || !director?.tenant_id) throw new Error('Brak autoryzacji');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          deal_team_contact_id: params.teamContactId,
          deal_team_id: params.teamId,
          tenant_id: director.tenant_id,
          assigned_to: params.assignedTo,
          owner_id: director.id,
          title: params.title,
          description: params.description || null,
          due_date: params.dueDate || null,
          priority: params.priority || 'medium',
          status: 'todo',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-assignments', params.teamContactId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-assignments-all', params.teamId] });
      toast.success('Zadanie dodane');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}

interface UpdateAssignmentParams {
  id: string;
  teamContactId: string;
  status?: string;
  title?: string;
  description?: string;
  dueDate?: string | null;
  priority?: string;
  assignedTo?: string;
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateAssignmentParams) => {
      const updates: Record<string, unknown> = {};

      if (params.status !== undefined) {
        updates.status = toTaskStatus(params.status);
        updates.completed_at = params.status === 'done' ? new Date().toISOString() : null;
      }
      if (params.title !== undefined) updates.title = params.title;
      if (params.description !== undefined) updates.description = params.description;
      if (params.dueDate !== undefined) updates.due_date = params.dueDate;
      if (params.priority !== undefined) updates.priority = params.priority;
      if (params.assignedTo !== undefined) updates.assigned_to = params.assignedTo;

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-assignments', params.teamContactId] });
    },
    onError: (error: Error) => {
      toast.error(`Błąd aktualizacji: ${error.message}`);
    },
  });
}

/**
 * Pobiera wszystkie zadania dla zespołu (z danymi kontaktu)
 * Używane w widoku "Moje zadania w lejku"
 */
export function useMyTeamAssignments(teamId: string | undefined) {
  return useQuery({
    queryKey: ['deal-team-assignments-all', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('deal_team_id', teamId)
        .order('status', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!tasks || tasks.length === 0) return [];

      // Fetch contact names for each deal_team_contact_id
      const teamContactIds = [...new Set(tasks.map((t: any) => t.deal_team_contact_id).filter(Boolean))];
      
      if (teamContactIds.length === 0) {
        return tasks.map((t: any) => ({
          ...t,
          status: fromTaskStatus(t.status || 'todo'),
          contact_name: 'Kontakt',
          contact_company: null,
        })) as DealTeamAssignment[];
      }

      const { data: teamContacts } = await supabase
        .from('deal_team_contacts')
        .select('id, contact_id')
        .in('id', teamContactIds);

      const contactIds = [...new Set((teamContacts || []).map((tc: { contact_id: string }) => tc.contact_id))];
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name, company')
        .in('id', contactIds);

      const contactMap = new Map((contacts || []).map((c: { id: string; full_name: string; company: string | null }) => [c.id, c]));
      const tcMap = new Map((teamContacts || []).map((tc: { id: string; contact_id: string }) => [tc.id, tc.contact_id]));

      return tasks.map((t: any) => {
        const contactId = t.deal_team_contact_id ? tcMap.get(t.deal_team_contact_id) : null;
        const contact = contactId ? contactMap.get(contactId) : null;
        return {
          ...t,
          status: fromTaskStatus(t.status || 'todo'),
          contact_name: contact?.full_name || 'Kontakt',
          contact_company: contact?.company || null,
        };
      }) as DealTeamAssignment[];
    },
    enabled: !!teamId,
    staleTime: 60 * 1000,
  });
}
