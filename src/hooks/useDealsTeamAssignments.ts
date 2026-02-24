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
  contact_category?: string | null;
  contact_offering_stage?: string | null;
  contact_id?: string | null;
}


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
      return (data || []) as unknown as DealTeamAssignment[];
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

      // Ensure task_contacts link exists for CRM visibility
      if (data) {
        const { data: dtc } = await supabase
          .from('deal_team_contacts')
          .select('contact_id')
          .eq('id', params.teamContactId)
          .single();

        if (dtc?.contact_id) {
          await supabase.from('task_contacts').insert({
            task_id: data.id,
            contact_id: dtc.contact_id,
            role: 'primary',
          });
        }
      }

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
        updates.status = params.status;
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
      queryClient.invalidateQueries({ queryKey: ['deal-team-assignments-all'] });
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
          contact_name: 'Kontakt',
          contact_company: null,
        })) as DealTeamAssignment[];
      }

      const { data: teamContacts } = await supabase
        .from('deal_team_contacts')
        .select('id, contact_id, category, offering_stage')
        .in('id', teamContactIds);

      const contactIds = [...new Set((teamContacts || []).map((tc: any) => tc.contact_id))];
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name, company')
        .in('id', contactIds);

      const contactMap = new Map((contacts || []).map((c: { id: string; full_name: string; company: string | null }) => [c.id, c]));
      const tcMap = new Map((teamContacts || []).map((tc: any) => [tc.id, tc]));

      return tasks.map((t: any) => {
        const tc = t.deal_team_contact_id ? tcMap.get(t.deal_team_contact_id) : null;
        const contact = tc?.contact_id ? contactMap.get(tc.contact_id) : null;
        return {
          ...t,
          contact_name: contact?.full_name || 'Kontakt',
          contact_company: contact?.company || null,
          contact_category: tc?.category || null,
          contact_offering_stage: tc?.offering_stage || null,
          contact_id: tc?.contact_id || null,
        };
      }) as DealTeamAssignment[];
    },
    enabled: !!teamId,
    staleTime: 60 * 1000,
  });
}

/**
 * Unified hook: fetches tasks for a deal contact from BOTH sources:
 * 1. tasks.deal_team_contact_id (deal funnel tasks)
 * 2. task_contacts join table (general CRM tasks)
 * Deduplicates and returns a merged list.
 */
export function useDealContactAllTasks(contactId: string | undefined, teamContactId: string | undefined) {
  return useQuery({
    queryKey: ['deal-contact-all-tasks', contactId, teamContactId],
    queryFn: async () => {
      if (!contactId) return [];

      const taskMap = new Map<string, any>();

      // Source 1: tasks linked via deal_team_contact_id
      if (teamContactId) {
        const { data: dealTasks, error: dealError } = await supabase
          .from('tasks')
        .select(`
          *,
          task_contacts(contact_id, role, contacts(id, full_name, company)),
          cross_tasks(id, contact_a_id, contact_b_id, connection_reason, suggested_intro, intro_made,
            discussed_with_a, discussed_with_a_at, discussed_with_b, discussed_with_b_at, intro_made_at,
            contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
            contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)),
          task_categories(id, name, color, icon, visibility_type, workflow_steps),
          owner:directors!tasks_owner_id_fkey(id, full_name),
          assignee:directors!tasks_assigned_to_fkey(id, full_name)
        `)
        .eq('deal_team_contact_id', teamContactId)
          .order('created_at', { ascending: false });

        if (dealError) throw dealError;
        (dealTasks || []).forEach((t: any) => {
          taskMap.set(t.id, t);
        });
      }

      // Source 2: tasks linked via task_contacts
      const { data: taskContacts, error: tcError } = await supabase
        .from('task_contacts')
        .select(`task_id, tasks(
          *,
          task_contacts(contact_id, role, contacts(id, full_name, company)),
          cross_tasks(id, contact_a_id, contact_b_id, connection_reason, suggested_intro, intro_made,
            discussed_with_a, discussed_with_a_at, discussed_with_b, discussed_with_b_at, intro_made_at,
            contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
            contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)),
          task_categories(id, name, color, icon, visibility_type, workflow_steps),
          owner:directors!tasks_owner_id_fkey(id, full_name),
          assignee:directors!tasks_assigned_to_fkey(id, full_name)
        )`)
        .eq('contact_id', contactId);

      if (tcError) throw tcError;
      (taskContacts || []).forEach((tc: any) => {
        if (tc.tasks && !taskMap.has(tc.tasks.id)) {
          taskMap.set(tc.tasks.id, tc.tasks);
        }
      });

      return Array.from(taskMap.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    },
    enabled: !!contactId,
    staleTime: 15 * 1000,
  });
}
