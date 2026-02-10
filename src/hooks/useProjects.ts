import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// ─── Types ──────────────────────────────────────────────
export type Project = Tables<'projects'>;
export type ProjectInsert = TablesInsert<'projects'>;
export type ProjectUpdate = TablesUpdate<'projects'>;
export type ProjectMember = Tables<'project_members'>;
export type ProjectContact = Tables<'project_contacts'>;
export type ProjectNote = Tables<'project_notes'>;
export type ProjectFile = Tables<'project_files'>;
export type ProjectTemplate = Tables<'project_templates'>;

export type ProjectWithOwner = Project & {
  owner?: { id: string; full_name: string } | null;
  team?: { id: string; name: string; color: string } | null;
};

// ─── Zod Schemas ────────────────────────────────────────
export const ProjectCreateSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['new', 'analysis', 'in_progress', 'waiting', 'done', 'cancelled']).default('new'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#7C3AED'),
  template_id: z.string().uuid().optional().nullable(),
  team_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

// ─── Status labels ──────────────────────────────────────
export const PROJECT_STATUSES = [
  { value: 'new', label: 'Nowy', color: 'bg-muted text-muted-foreground' },
  { value: 'analysis', label: 'Analiza', color: 'bg-info/10 text-info' },
  { value: 'in_progress', label: 'W toku', color: 'bg-primary/10 text-primary' },
  { value: 'waiting', label: 'Oczekuje', color: 'bg-warning/10 text-warning' },
  { value: 'done', label: 'Zakończony', color: 'bg-success/10 text-success' },
  { value: 'cancelled', label: 'Anulowany', color: 'bg-destructive/10 text-destructive' },
] as const;

export function getStatusConfig(status: string) {
  return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
}

// ─── Hooks ──────────────────────────────────────────────

interface ProjectsFilters {
  status?: string;
  search?: string;
}

export function useProjects(filters: ProjectsFilters = {}) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['projects', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*, owner:directors!projects_owner_id_fkey(id, full_name), team:deal_teams(id, name, color)')
        .eq('tenant_id', tenantId!);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw error;
      return data as ProjectWithOwner[];
    },
    enabled: !!tenantId,
  });
}

export function useProject(id: string | undefined) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, owner:directors!projects_owner_id_fkey(id, full_name), team:deal_teams(id, name, color)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as ProjectWithOwner;
    },
    enabled: !!id && !!tenantId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (input: ProjectCreateInput) => {
      const validated = ProjectCreateSchema.parse(input);

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...validated,
          tenant_id: director!.tenant_id,
          owner_id: director!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projekt został utworzony');
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || 'Błąd walidacji');
      } else {
        toast.error('Błąd podczas tworzenia projektu');
      }
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProjectCreateInput> }) => {
      const validated = ProjectUpdateSchema.parse(data);

      const { data: result, error } = await supabase
        .from('projects')
        .update(validated)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
      toast.success('Projekt zaktualizowany');
    },
    onError: () => {
      toast.error('Błąd podczas aktualizacji projektu');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projekt anulowany');
    },
    onError: () => {
      toast.error('Błąd podczas usuwania projektu');
    },
  });
}

// ─── Project Members ────────────────────────────────────

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('*, director:directors(id, full_name)')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, directorId, role = 'member' }: {
      projectId: string;
      directorId: string;
      role?: string;
    }) => {
      const { data, error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          director_id: directorId,
          tenant_id: director!.tenant_id,
          role,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', vars.projectId] });
      toast.success('Dodano członka projektu');
    },
    onError: () => {
      toast.error('Błąd podczas dodawania członka');
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, projectId }: { memberId: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', vars.projectId] });
      toast.success('Usunięto członka projektu');
    },
  });
}

// ─── Project Contacts ───────────────────────────────────

export function useProjectContacts(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-contacts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contacts')
        .select('*, contact:contacts(id, full_name, email, phone, position)')
        .eq('project_id', projectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useAddProjectContact() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, contactId, roleInProject }: {
      projectId: string;
      contactId: string;
      roleInProject?: string;
    }) => {
      const { data, error } = await supabase
        .from('project_contacts')
        .insert({
          project_id: projectId,
          contact_id: contactId,
          role_in_project: roleInProject,
          tenant_id: director!.tenant_id,
          added_by: director!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-contacts', vars.projectId] });
      toast.success('Dodano kontakt do projektu');
    },
    onError: () => {
      toast.error('Błąd podczas dodawania kontaktu');
    },
  });
}

export function useRemoveProjectContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_contacts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-contacts', vars.projectId] });
      toast.success('Usunięto kontakt z projektu');
    },
  });
}

// ─── Project Notes ──────────────────────────────────────

export function useProjectNotes(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-notes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_notes')
        .select('*, author:directors(id, full_name)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateProjectNote() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, content, contactId }: {
      projectId: string;
      content: string;
      contactId?: string;
    }) => {
      const { data, error } = await supabase
        .from('project_notes')
        .insert({
          project_id: projectId,
          content,
          contact_id: contactId,
          tenant_id: director!.tenant_id,
          created_by: director!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-notes', vars.projectId] });
      toast.success('Notatka dodana');
    },
  });
}

// ─── Project Files ──────────────────────────────────────

export function useProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-files', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId!)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useUploadProjectFile() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: string; file: File }) => {
      const filePath = `${director!.tenant_id}/${projectId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          tenant_id: director!.tenant_id,
          uploaded_by: director!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-files', vars.projectId] });
      toast.success('Plik przesłany');
    },
    onError: () => {
      toast.error('Błąd podczas przesyłania pliku');
    },
  });
}

// ─── Project Tasks (filtered from tasks table) ──────────

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
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
          ),
          task_categories(id, name, color, icon, visibility_type, workflow_steps),
          owner:directors!tasks_owner_id_fkey(id, full_name),
          assignee:directors!tasks_assigned_to_fkey(id, full_name)
        `)
        .eq('project_id', projectId!)
        .is('parent_task_id', null)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}
