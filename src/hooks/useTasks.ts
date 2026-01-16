import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Task = Tables<'tasks'>;
export type TaskInsert = TablesInsert<'tasks'>;
export type TaskUpdate = TablesUpdate<'tasks'>;
export type CrossTask = Tables<'cross_tasks'>;
export type TaskContact = Tables<'task_contacts'>;

export interface TasksFilters {
  status?: 'all' | 'pending' | 'in_progress' | 'completed';
  taskType?: 'all' | 'standard' | 'cross' | 'group';
  priority?: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  search?: string;
}

export interface TaskWithDetails extends Task {
  task_contacts: Array<{
    contact_id: string;
    role: string;
    contacts: {
      id: string;
      full_name: string;
      company: string | null;
    };
  }>;
  cross_tasks: Array<{
    id: string;
    contact_a_id: string;
    contact_b_id: string;
    connection_reason: string | null;
    suggested_intro: string | null;
    intro_made: boolean | null;
    discussed_with_a: boolean | null;
    discussed_with_a_at: string | null;
    discussed_with_b: boolean | null;
    discussed_with_b_at: string | null;
    intro_made_at: string | null;
    contact_a: {
      id: string;
      full_name: string;
      company: string | null;
    };
    contact_b: {
      id: string;
      full_name: string;
      company: string | null;
    };
  }>;
}

export interface CrossTaskInput {
  title: string;
  description?: string;
  priority?: string;
  due_date?: string;
  contact_a_id: string;
  contact_b_id: string;
  connection_reason?: string;
  suggested_intro?: string;
}

// Fetch tasks with filters
export function useTasks(filters: TasksFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          task_contacts(
            contact_id,
            role,
            contacts(id, full_name, company)
          ),
          cross_tasks(
            id,
            contact_a_id,
            contact_b_id,
            connection_reason,
            suggested_intro,
            intro_made,
            discussed_with_a,
            discussed_with_a_at,
            discussed_with_b,
            discussed_with_b_at,
            intro_made_at,
            contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
            contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.taskType && filters.taskType !== 'all') {
        query = query.eq('task_type', filters.taskType);
      }
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TaskWithDetails[];
    },
  });
}

// Fetch single task with details
export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_contacts(
            contact_id,
            role,
            contacts(id, full_name, company)
          ),
          cross_tasks(
            id,
            contact_a_id,
            contact_b_id,
            connection_reason,
            suggested_intro,
            intro_made,
            discussed_with_a,
            discussed_with_a_at,
            discussed_with_b,
            discussed_with_b_at,
            intro_made_at,
            contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
            contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as TaskWithDetails;
    },
    enabled: !!id,
  });
}

// Fetch tasks for a specific contact (including cross-tasks)
export function useContactTasksWithCross(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-tasks-with-cross', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      // Get tasks where contact is in task_contacts
      const { data: directTasks, error: directError } = await supabase
        .from('task_contacts')
        .select(`
          task_id,
          role,
          tasks(
            *,
            task_contacts(
              contact_id,
              role,
              contacts(id, full_name, company)
            ),
            cross_tasks(
              id,
              contact_a_id,
              contact_b_id,
              connection_reason,
              suggested_intro,
              intro_made,
              discussed_with_a,
              discussed_with_a_at,
              discussed_with_b,
              discussed_with_b_at,
              intro_made_at,
              contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
              contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)
            )
          )
        `)
        .eq('contact_id', contactId);

      if (directError) throw directError;

      // Get cross-tasks where contact is either A or B
      const { data: crossTasksA, error: crossErrorA } = await supabase
        .from('cross_tasks')
        .select(`
          *,
          tasks(*),
          contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
          contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)
        `)
        .eq('contact_a_id', contactId);

      if (crossErrorA) throw crossErrorA;

      const { data: crossTasksB, error: crossErrorB } = await supabase
        .from('cross_tasks')
        .select(`
          *,
          tasks(*),
          contact_a:contacts!cross_tasks_contact_a_id_fkey(id, full_name, company),
          contact_b:contacts!cross_tasks_contact_b_id_fkey(id, full_name, company)
        `)
        .eq('contact_b_id', contactId);

      if (crossErrorB) throw crossErrorB;

      // Combine and deduplicate
      const taskMap = new Map<string, any>();
      
      // Add direct tasks
      directTasks?.forEach(tc => {
        if (tc.tasks) {
          taskMap.set(tc.tasks.id, {
            ...tc.tasks,
            currentContactRole: tc.role,
          });
        }
      });

      // Add cross-tasks (contact is A)
      crossTasksA?.forEach(ct => {
        if (ct.tasks && !taskMap.has(ct.tasks.id)) {
          taskMap.set(ct.tasks.id, {
            ...ct.tasks,
            cross_tasks: [ct],
            crossTaskInfo: {
              isContactA: true,
              otherContact: ct.contact_b,
            },
          });
        }
      });

      // Add cross-tasks (contact is B)
      crossTasksB?.forEach(ct => {
        if (ct.tasks && !taskMap.has(ct.tasks.id)) {
          taskMap.set(ct.tasks.id, {
            ...ct.tasks,
            cross_tasks: [ct],
            crossTaskInfo: {
              isContactA: false,
              otherContact: ct.contact_a,
            },
          });
        }
      });

      return Array.from(taskMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!contactId,
  });
}

// Count pending tasks
export function usePendingTasksCount() {
  return useQuery({
    queryKey: ['pending-tasks-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });
}

// Create standard task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      task: TaskInsert;
      contactId?: string;
    }) => {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert(input.task)
        .select()
        .single();

      if (taskError) throw taskError;

      // Add task_contact if contact provided
      if (input.contactId) {
        const { error: contactError } = await supabase
          .from('task_contacts')
          .insert({
            task_id: task.id,
            contact_id: input.contactId,
            role: 'primary',
          });

        if (contactError) throw contactError;
      }

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      queryClient.invalidateQueries({ queryKey: ['contact-tasks-with-cross'] });
    },
  });
}

// Create cross-task
export function useCreateCrossTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CrossTaskInput) => {
      // First, get tenant_id from an existing contact
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('tenant_id')
        .eq('id', input.contact_a_id)
        .single();

      if (contactError) throw contactError;

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: input.title,
          description: input.description,
          task_type: 'cross',
          priority: input.priority || 'medium',
          due_date: input.due_date,
          status: 'pending',
          tenant_id: contactData.tenant_id,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Create cross_task record
      const { error: crossError } = await supabase
        .from('cross_tasks')
        .insert({
          task_id: task.id,
          contact_a_id: input.contact_a_id,
          contact_b_id: input.contact_b_id,
          connection_reason: input.connection_reason,
          suggested_intro: input.suggested_intro,
        });

      if (crossError) throw crossError;

      // Add both contacts to task_contacts
      const { error: contactsError } = await supabase
        .from('task_contacts')
        .insert([
          { task_id: task.id, contact_id: input.contact_a_id, role: 'contact_a' },
          { task_id: task.id, contact_id: input.contact_b_id, role: 'contact_b' },
        ]);

      if (contactsError) throw contactsError;

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      queryClient.invalidateQueries({ queryKey: ['contact-tasks-with-cross'] });
    },
  });
}

// Update task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      queryClient.invalidateQueries({ queryKey: ['contact-tasks-with-cross'] });
    },
  });
}

// Update cross-task status (workflow)
export function useUpdateCrossTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      crossTaskId: string;
      field: 'discussed_with_a' | 'discussed_with_b' | 'intro_made';
      value: boolean;
    }) => {
      const updates: any = {
        [input.field]: input.value,
      };

      // Add timestamp when setting to true
      if (input.value) {
        if (input.field === 'discussed_with_a') {
          updates.discussed_with_a_at = new Date().toISOString();
        } else if (input.field === 'discussed_with_b') {
          updates.discussed_with_b_at = new Date().toISOString();
        } else if (input.field === 'intro_made') {
          updates.intro_made = true;
          updates.intro_made_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from('cross_tasks')
        .update(updates)
        .eq('id', input.crossTaskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['contact-tasks-with-cross'] });
    },
  });
}

// Delete task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete task_contacts first
      await supabase.from('task_contacts').delete().eq('task_id', id);
      
      // Delete cross_tasks
      await supabase.from('cross_tasks').delete().eq('task_id', id);
      
      // Delete the task
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      queryClient.invalidateQueries({ queryKey: ['contact-tasks-with-cross'] });
    },
  });
}
