import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkflowStep {
  id: string;
  name: string;
  order: number;
  required: boolean;
}

export interface WorkflowConfig {
  steps: WorkflowStep[];
  auto_complete_on?: string;
  allow_snooze?: boolean;
  snooze_creates_ping?: boolean;
}

export interface TaskCategory {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  visibility_type: 'individual' | 'team' | 'shared';
  is_kpi: boolean;
  kpi_target: number | null;
  workflow_steps: WorkflowConfig | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCategoryInsert {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  visibility_type?: 'individual' | 'team' | 'shared';
  is_kpi?: boolean;
  kpi_target?: number;
  workflow_steps?: WorkflowConfig;
  sort_order?: number;
  is_active?: boolean;
}

export interface TaskCategoryUpdate extends Partial<TaskCategoryInsert> {
  id: string;
}

// Fetch all task categories
export function useTaskCategories() {
  return useQuery({
    queryKey: ['task-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Parse workflow_steps from JSON
      return (data || []).map(cat => ({
        ...cat,
        workflow_steps: cat.workflow_steps as unknown as WorkflowConfig | null,
      })) as TaskCategory[];
    },
  });
}

// Fetch all categories including inactive
export function useAllTaskCategories() {
  return useQuery({
    queryKey: ['task-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(cat => ({
        ...cat,
        workflow_steps: cat.workflow_steps as unknown as WorkflowConfig | null,
      })) as TaskCategory[];
    },
  });
}

// Create task category
export function useCreateTaskCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TaskCategoryInsert) => {
      // Get tenant_id from director
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: director, error: directorError } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (directorError) throw directorError;

      const { data, error } = await supabase
        .from('task_categories')
        .insert({
          ...input,
          tenant_id: director.tenant_id,
          workflow_steps: input.workflow_steps ? JSON.parse(JSON.stringify(input.workflow_steps)) : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      queryClient.invalidateQueries({ queryKey: ['task-categories-all'] });
    },
  });
}

// Update task category
export function useUpdateTaskCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskCategoryUpdate) => {
      const updateData = {
        ...updates,
        workflow_steps: updates.workflow_steps 
          ? JSON.parse(JSON.stringify(updates.workflow_steps)) 
          : undefined,
      };

      const { data, error } = await supabase
        .from('task_categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      queryClient.invalidateQueries({ queryKey: ['task-categories-all'] });
    },
  });
}

// Delete task category (soft delete by setting is_active = false)
export function useDeleteTaskCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-categories'] });
      queryClient.invalidateQueries({ queryKey: ['task-categories-all'] });
    },
  });
}

// Fetch KPI categories with task counts
export function useKPICategories() {
  return useQuery({
    queryKey: ['kpi-categories'],
    queryFn: async () => {
      // Get categories with KPI enabled
      const { data: categories, error: catError } = await supabase
        .from('task_categories')
        .select('*')
        .eq('is_kpi', true)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (catError) throw catError;
      if (!categories || categories.length === 0) return [];

      // Get task counts for each category
      const categoryIds = categories.map(c => c.id);
      const { data: taskCounts, error: countError } = await supabase
        .from('tasks')
        .select('category_id, status')
        .in('category_id', categoryIds);

      if (countError) throw countError;

      // Build results with counts
      return categories.map(cat => {
        const categoryTasks = taskCounts?.filter(t => t.category_id === cat.id) || [];
        const completedCount = categoryTasks.filter(t => t.status === 'completed').length;
        const totalCount = categoryTasks.length;

        return {
          ...cat,
          workflow_steps: cat.workflow_steps as unknown as WorkflowConfig | null,
          task_count: totalCount,
          completed_count: completedCount,
          progress: cat.kpi_target 
            ? Math.round((completedCount / cat.kpi_target) * 100) 
            : (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0),
        };
      }) as (TaskCategory & { task_count: number; completed_count: number; progress: number })[];
    },
  });
}
