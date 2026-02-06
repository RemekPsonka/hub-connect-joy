import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DealTeamAssignment {
  id: string;
  team_contact_id: string;
  team_id: string;
  tenant_id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string | null;
  priority: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export function useContactAssignments(teamContactId: string | undefined) {
  return useQuery({
    queryKey: ['deal-team-assignments', teamContactId],
    queryFn: async () => {
      if (!teamContactId) return [];

      const { data, error } = await supabase
        .from('deal_team_assignments')
        .select('*')
        .eq('team_contact_id', teamContactId)
        .order('status', { ascending: true }) // pending first
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DealTeamAssignment[];
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
        .from('deal_team_assignments')
        .insert({
          team_contact_id: params.teamContactId,
          team_id: params.teamId,
          tenant_id: director.tenant_id,
          assigned_to: params.assignedTo,
          assigned_by: director.id,
          title: params.title,
          description: params.description || null,
          due_date: params.dueDate || null,
          priority: params.priority || 'medium',
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-assignments', params.teamContactId] });
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
        updates.status = params.status;
        updates.completed_at = params.status === 'done' ? new Date().toISOString() : null;
      }
      if (params.title !== undefined) updates.title = params.title;
      if (params.description !== undefined) updates.description = params.description;
      if (params.dueDate !== undefined) updates.due_date = params.dueDate;
      if (params.priority !== undefined) updates.priority = params.priority;
      if (params.assignedTo !== undefined) updates.assigned_to = params.assignedTo;

      const { error } = await supabase
        .from('deal_team_assignments')
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
