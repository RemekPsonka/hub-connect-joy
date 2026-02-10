import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskCustomField {
  id: string;
  tenant_id: string;
  project_id: string | null;
  name: string;
  field_type: string;
  options: any;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface TaskCustomFieldValue {
  id: string;
  task_id: string;
  field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_boolean: boolean | null;
  tenant_id: string;
}

export function useTaskCustomFields(projectId?: string | null) {
  return useQuery({
    queryKey: ['task-custom-fields', projectId],
    queryFn: async () => {
      let query = supabase
        .from('task_custom_fields' as any)
        .select('*')
        .order('sort_order');

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      } else {
        query = query.is('project_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TaskCustomField[];
    },
  });
}

export function useTaskCustomFieldValues(taskId: string) {
  return useQuery({
    queryKey: ['task-custom-field-values', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_custom_field_values' as any)
        .select('*, field:task_custom_fields(*)')
        .eq('task_id', taskId);
      if (error) throw error;
      return data as unknown as (TaskCustomFieldValue & { field: TaskCustomField })[];
    },
    enabled: !!taskId,
  });
}

export function useUpsertCustomFieldValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      taskId: string;
      fieldId: string;
      value: string | number | boolean | null;
      fieldType: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: director } = await supabase.from('directors').select('tenant_id').eq('user_id', user.id).single();
      if (!director) throw new Error('Director not found');

      const row: any = {
        task_id: input.taskId,
        field_id: input.fieldId,
        tenant_id: director.tenant_id,
        updated_at: new Date().toISOString(),
      };

      if (input.fieldType === 'number') row.value_number = input.value;
      else if (input.fieldType === 'checkbox') row.value_boolean = input.value;
      else if (input.fieldType === 'date') row.value_date = input.value;
      else row.value_text = input.value as string;

      const { error } = await supabase
        .from('task_custom_field_values' as any)
        .upsert(row, { onConflict: 'task_id,field_id' });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['task-custom-field-values', v.taskId] });
    },
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; fieldType: string; projectId?: string | null; options?: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: director } = await supabase.from('directors').select('tenant_id').eq('user_id', user.id).single();
      if (!director) throw new Error('Director not found');

      const { error } = await supabase.from('task_custom_fields' as any).insert({
        tenant_id: director.tenant_id,
        name: input.name,
        field_type: input.fieldType,
        project_id: input.projectId || null,
        options: input.options || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-custom-fields'] });
    },
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase.from('task_custom_fields' as any).delete().eq('id', fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-custom-fields'] });
    },
  });
}
