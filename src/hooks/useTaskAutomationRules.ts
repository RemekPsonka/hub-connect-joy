import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AutomationRule {
  id: string;
  tenant_id: string;
  project_id: string | null;
  name: string;
  trigger_type: string;
  trigger_config: any;
  action_type: string;
  action_config: any;
  is_active: boolean;
  created_at: string;
}

export function useAutomationRules(projectId?: string | null) {
  return useQuery({
    queryKey: ['task-automation-rules', projectId],
    queryFn: async () => {
      let query = supabase
        .from('task_automation_rules' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AutomationRule[];
    },
  });
}

export function useCreateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      triggerType: string;
      triggerConfig?: any;
      actionType: string;
      actionConfig?: any;
      projectId?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: director } = await supabase.from('directors').select('tenant_id').eq('user_id', user.id).single();
      if (!director) throw new Error('Director not found');

      const { error } = await supabase.from('task_automation_rules' as any).insert({
        tenant_id: director.tenant_id,
        project_id: input.projectId || null,
        name: input.name,
        trigger_type: input.triggerType,
        trigger_config: input.triggerConfig || {},
        action_type: input.actionType,
        action_config: input.actionConfig || {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-automation-rules'] });
    },
  });
}

export function useToggleAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('task_automation_rules' as any)
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-automation-rules'] });
    },
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_automation_rules' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-automation-rules'] });
    },
  });
}
