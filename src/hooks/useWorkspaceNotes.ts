import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkspaceNote {
  id: string;
  tenant_id: string;
  actor_id: string;
  title: string | null;
  blocks: any;
  pinned: boolean;
  parent_note_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

const KEY = ['workspace_notes'];

export function useWorkspaceNotes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_notes')
        .select('*')
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkspaceNote[];
    },
  });
}

export function useWorkspaceNote(id: string | null) {
  return useQuery({
    queryKey: ['workspace_notes', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('workspace_notes').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as WorkspaceNote | null;
    },
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title?: string; blocks?: any }) => {
      const { data: dirData } = await supabase.rpc('get_current_director_id');
      const { data: tenantData } = await supabase.rpc('get_current_tenant_id');
      const { data, error } = await supabase
        .from('workspace_notes')
        .insert({
          actor_id: dirData as unknown as string,
          tenant_id: tenantData as unknown as string,
          title: input.title ?? 'Nowa notatka',
          blocks: input.blocks ?? { type: 'doc', content: [] },
        })
        .select()
        .single();
      if (error) throw error;
      return data as WorkspaceNote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast.error('Nie udało się utworzyć notatki: ' + e.message),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; title?: string; blocks?: any; pinned?: boolean }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase.from('workspace_notes').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as WorkspaceNote;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['workspace_notes', data.id] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workspace_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
