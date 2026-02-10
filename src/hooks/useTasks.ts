import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { calculateCrossTaskStatus, calculateCrossTaskProgress } from '@/utils/crossTaskStatus';

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
  crossProgress?: 'all' | '0' | '1' | '2' | '3';
  contactId?: string;
  projectId?: string;
  sortBy?: 'created_at' | 'due_date' | 'priority';
  sortDirection?: 'asc' | 'desc';
  visibility?: 'all' | 'private' | 'team' | 'public';
  categoryId?: string;
  ownerId?: string;
  assignedTo?: string;
  excludeSnoozed?: boolean;
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
      // If filtering by contact, first get the task IDs related to that contact
      let taskIdsFromContact: string[] | null = null;
      
      if (filters.contactId) {
        // Get tasks where contact is in task_contacts
        const { data: taskContacts } = await supabase
          .from('task_contacts')
          .select('task_id')
          .eq('contact_id', filters.contactId);
        
        // Get cross-tasks where contact is A or B
        const { data: crossTasksA } = await supabase
          .from('cross_tasks')
          .select('task_id')
          .eq('contact_a_id', filters.contactId);
        
        const { data: crossTasksB } = await supabase
          .from('cross_tasks')
          .select('task_id')
          .eq('contact_b_id', filters.contactId);
        
        // Combine all task IDs
        const allTaskIds = new Set<string>();
        taskContacts?.forEach(tc => tc.task_id && allTaskIds.add(tc.task_id));
        crossTasksA?.forEach(ct => ct.task_id && allTaskIds.add(ct.task_id));
        crossTasksB?.forEach(ct => ct.task_id && allTaskIds.add(ct.task_id));
        
        taskIdsFromContact = Array.from(allTaskIds);
        
        // If no tasks found for this contact, return empty array
        if (taskIdsFromContact.length === 0) {
          return [];
        }
      }

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
          ),
          task_categories(id, name, color, icon, visibility_type, workflow_steps),
          owner:directors!tasks_owner_id_fkey(id, full_name),
          assignee:directors!tasks_assigned_to_fkey(id, full_name)
        `);

      // Apply sorting - priority requires client-side sorting
      const sortField = filters.sortBy || 'created_at';
      const ascending = filters.sortDirection === 'asc';
      
      if (sortField !== 'priority') {
        query = query.order(sortField, { ascending, nullsFirst: false });
      } else {
        // For priority, we'll sort client-side after fetching
        query = query.order('created_at', { ascending: false });
      }

      // Apply contact filter if we have task IDs
      if (taskIdsFromContact) {
        query = query.in('id', taskIdsFromContact);
      }

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
      // New filters
      if (filters.visibility && filters.visibility !== 'all') {
        query = query.eq('visibility', filters.visibility);
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters.ownerId) {
        query = query.eq('owner_id', filters.ownerId);
      }
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters.excludeSnoozed) {
        query = query.or('snoozed_until.is.null,snoozed_until.lte.' + new Date().toISOString().split('T')[0]);
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let result = data as TaskWithDetails[];
      
      // Client-side filter for cross-task progress
      if (filters.crossProgress && filters.crossProgress !== 'all') {
        const targetProgress = parseInt(filters.crossProgress);
        result = result.filter(task => {
          if (task.task_type !== 'cross' || !task.cross_tasks?.[0]) return false;
          const progress = calculateCrossTaskProgress(task.cross_tasks[0]);
          return progress.completed === targetProgress;
        });
      }

      // Client-side sorting for priority
      if (sortField === 'priority') {
        const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        result.sort((a, b) => {
          const aVal = priorityOrder[a.priority || 'low'] || 0;
          const bVal = priorityOrder[b.priority || 'low'] || 0;
          return ascending ? aVal - bVal : bVal - aVal;
        });
      }
      
      return result;
    },
    staleTime: 15 * 1000, // 15 sekund
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
    staleTime: 15 * 1000, // 15 sekund
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
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    },
    enabled: !!contactId,
    staleTime: 15 * 1000, // 15 sekund
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
    staleTime: 15 * 1000, // 15 sekund
  });
}

// Create standard task
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      task: Omit<TaskInsert, 'tenant_id'>;
      contactId?: string;
      categoryId?: string;
      assignedTo?: string;
      visibility?: 'private' | 'team' | 'public';
    }) => {
      // Get tenant_id and director_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: director, error: directorError } = await supabase
        .from('directors')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .single();

      if (directorError) throw directorError;

      // Determine visibility based on category if not explicitly set
      let visibility = input.visibility || 'private';
      if (input.categoryId && !input.visibility) {
        const { data: category } = await supabase
          .from('task_categories')
          .select('visibility_type, workflow_steps')
          .eq('id', input.categoryId)
          .single();
        
        if (category?.visibility_type === 'team') {
          visibility = 'team';
        } else if (category?.visibility_type === 'individual') {
          visibility = 'private';
        }
      }

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          ...input.task,
          tenant_id: director.tenant_id,
          owner_id: director.id,
          assigned_to: input.assignedTo || null,
          category_id: input.categoryId || null,
          visibility,
        })
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-tasks'] });
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

      const { data: crossTask, error } = await supabase
        .from('cross_tasks')
        .update(updates)
        .eq('id', input.crossTaskId)
        .select('*, task_id')
        .single();

      if (error) throw error;

      // Calculate new status based on cross-task workflow and update main task
      const newStatus = calculateCrossTaskStatus(crossTask);
      
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', crossTask.task_id!);

      if (taskError) throw taskError;

      return crossTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      queryClient.invalidateQueries({ queryKey: ['contact-tasks-with-cross'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['consultation-tasks'] });
    },
  });
}

// ─── Subtasks ───────────────────────────────────────────

export function useSubtasks(parentTaskId: string | undefined) {
  return useQuery({
    queryKey: ['subtasks', parentTaskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', parentTaskId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!parentTaskId,
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parentTaskId, title }: { parentTaskId: string; title: string }) => {
      // Get parent task's tenant_id and project_id
      const { data: parent, error: parentError } = await supabase
        .from('tasks')
        .select('tenant_id, project_id, owner_id')
        .eq('id', parentTaskId)
        .single();
      if (parentError) throw parentError;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title,
          parent_task_id: parentTaskId,
          tenant_id: parent.tenant_id,
          project_id: parent.project_id,
          owner_id: parent.owner_id,
          status: 'pending',
          priority: 'medium',
          task_type: 'standard',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', vars.parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
  });
}

// ─── Bulk Operations ────────────────────────────────────

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<TaskUpdate> }) => {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
  });
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase.from('task_contacts').delete().in('task_id', ids);
      await supabase.from('cross_tasks').delete().in('task_id', ids);
      const { error } = await supabase.from('tasks').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
