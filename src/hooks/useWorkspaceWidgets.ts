import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type WidgetType = 'kpi' | 'note' | 'ai_recs' | 'calendar';

export interface WorkspaceWidget {
  id: string;
  tenant_id: string;
  actor_id: string;
  widget_type: WidgetType;
  config: any;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  size: string;
  created_at: string;
}

const KEY = ['workspace_widgets'];

export function useWorkspaceWidgets() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('workspace_widgets').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkspaceWidget[];
    },
  });
}

export function useUpsertWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<WorkspaceWidget> & { widget_type: WidgetType }) => {
      const { data: dirData } = await supabase.rpc('get_current_director_id');
      const { data: tenantData } = await supabase.rpc('get_current_tenant_id');
      const payload: any = {
        actor_id: dirData,
        tenant_id: tenantData,
        widget_type: input.widget_type,
        config: input.config ?? {},
        grid_x: input.grid_x ?? 0,
        grid_y: input.grid_y ?? 0,
        grid_w: input.grid_w ?? 4,
        grid_h: input.grid_h ?? 3,
        size: input.size ?? 'medium',
      };
      if (input.id) payload.id = input.id;
      const { data, error } = await supabase.from('workspace_widgets').upsert(payload).select().single();
      if (error) throw error;
      return data as WorkspaceWidget;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast.error('Nie udało się zapisać widgetu: ' + e.message),
  });
}

export function useRemoveWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workspace_widgets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateWidgetLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (layouts: Array<{ id: string; x: number; y: number; w: number; h: number }>) => {
      await Promise.all(
        layouts.map((l) =>
          supabase.from('workspace_widgets').update({ grid_x: l.x, grid_y: l.y, grid_w: l.w, grid_h: l.h }).eq('id', l.id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
