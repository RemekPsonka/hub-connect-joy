import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Schedule ───────────────────────────────────────────

export function useWorkspaceSchedule() {
  const { director } = useAuth();
  return useQuery({
    queryKey: ['workspace-schedule', director?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_schedule')
        .select('*, project:projects(id, name, color, description, status)')
        .eq('director_id', director!.id)
        .order('day_of_week')
        .order('time_block');
      if (error) throw error;
      return data;
    },
    enabled: !!director?.id,
  });
}

export function useAssignProjectToDay() {
  const qc = useQueryClient();
  const { director } = useAuth();
  return useMutation({
    mutationFn: async ({ dayOfWeek, projectId, timeBlock }: { dayOfWeek: number; projectId: string; timeBlock: number }) => {
      const { data, error } = await supabase
        .from('workspace_schedule')
        .upsert({
          director_id: director!.id,
          tenant_id: director!.tenant_id,
          day_of_week: dayOfWeek,
          project_id: projectId,
          time_block: timeBlock,
        }, { onConflict: 'director_id,day_of_week,time_block' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-schedule'] });
      toast.success('Projekt przypisany');
    },
    onError: () => toast.error('Nie udało się przypisać projektu'),
  });
}

export function useRemoveProjectFromDay() {
  const qc = useQueryClient();
  const { director } = useAuth();
  return useMutation({
    mutationFn: async ({ dayOfWeek, timeBlock }: { dayOfWeek: number; timeBlock: number }) => {
      const { error } = await supabase
        .from('workspace_schedule')
        .delete()
        .eq('director_id', director!.id)
        .eq('day_of_week', dayOfWeek)
        .eq('time_block', timeBlock);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-schedule'] });
      toast.success('Przypisanie usunięte');
    },
  });
}

// ─── Project Links ──────────────────────────────────────

export function useProjectLinks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-links', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_links')
        .select('*, creator:directors!project_links_created_by_fkey(id, full_name)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useAddProjectLink() {
  const qc = useQueryClient();
  const { director } = useAuth();
  return useMutation({
    mutationFn: async (link: { projectId: string; title: string; url: string; category: string }) => {
      const { data, error } = await supabase
        .from('project_links')
        .insert({
          project_id: link.projectId,
          tenant_id: director!.tenant_id,
          title: link.title,
          url: link.url,
          category: link.category,
          created_by: director!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project-links', vars.projectId] });
      toast.success('Link dodany');
    },
    onError: () => toast.error('Nie udało się dodać linku'),
  });
}

export function useDeleteProjectLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_links').delete().eq('id', id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ['project-links', projectId] });
      toast.success('Link usunięty');
    },
  });
}

// ─── Workspace Topics ───────────────────────────────────

export function useWorkspaceTopics(projectId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-topics', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_topics')
        .select('*, author:directors!workspace_topics_author_id_fkey(id, full_name)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useAddWorkspaceTopic() {
  const qc = useQueryClient();
  const { director } = useAuth();
  return useMutation({
    mutationFn: async ({ projectId, content }: { projectId: string; content: string }) => {
      const { data, error } = await supabase
        .from('workspace_topics')
        .insert({
          project_id: projectId,
          tenant_id: director!.tenant_id,
          content,
          author_id: director!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workspace-topics', data.project_id] });
      toast.success('Temat dodany');
    },
    onError: () => toast.error('Nie udało się dodać tematu'),
  });
}

export function useToggleTopicResolved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, resolved }: { id: string; projectId: string; resolved: boolean }) => {
      const { error } = await supabase
        .from('workspace_topics')
        .update({
          is_resolved: resolved,
          resolved_at: resolved ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ['workspace-topics', projectId] });
    },
  });
}
