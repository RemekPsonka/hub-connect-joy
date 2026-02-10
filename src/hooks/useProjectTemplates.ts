import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TemplateTask {
  title: string;
  priority?: string;
  description?: string;
}

export interface TemplateSection {
  name: string;
  color: string;
  tasks: TemplateTask[];
}

export interface TemplateData {
  sections: TemplateSection[];
}

export function useProjectTemplates() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['project-templates', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateProjectTemplate() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({ name, templateData }: { name: string; templateData: TemplateData }) => {
      const { data, error } = await supabase
        .from('project_templates')
        .insert({
          name,
          template_data: templateData as any,
          tenant_id: director!.tenant_id,
          created_by: director!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      toast.success('Szablon utworzony');
    },
    onError: () => toast.error('Błąd tworzenia szablonu'),
  });
}

export function useDeleteProjectTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      toast.success('Szablon usunięty');
    },
    onError: () => toast.error('Błąd usuwania szablonu'),
  });
}

export function useCreateProjectFromTemplate() {
  const queryClient = useQueryClient();
  const { director } = useAuth();

  return useMutation({
    mutationFn: async ({
      projectName,
      templateId,
    }: {
      projectName: string;
      templateId: string;
    }) => {
      // 1. Get template
      const { data: template, error: tErr } = await supabase
        .from('project_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (tErr) throw tErr;

      const td = template.template_data as unknown as TemplateData;

      // 2. Create project
      const { data: project, error: pErr } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          tenant_id: director!.tenant_id,
          owner_id: director!.id,
          template_id: templateId,
          status: 'new',
          color: '#7C3AED',
        })
        .select()
        .single();
      if (pErr) throw pErr;

      // 3. Create sections and tasks
      if (td?.sections) {
        for (let si = 0; si < td.sections.length; si++) {
          const sec = td.sections[si];
          const { data: section, error: sErr } = await supabase
            .from('task_sections')
            .insert({
              project_id: project.id,
              name: sec.name,
              color: sec.color,
              sort_order: si,
              tenant_id: director!.tenant_id,
            })
            .select()
            .single();
          if (sErr) continue;

          for (let ti = 0; ti < sec.tasks.length; ti++) {
            const t = sec.tasks[ti];
            await supabase.from('tasks').insert({
              title: t.title,
              description: t.description || null,
              priority: t.priority || 'medium',
              project_id: project.id,
              section_id: section.id,
              sort_order: ti,
              tenant_id: director!.tenant_id,
              owner_id: director!.id,
            });
          }
        }
      }

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projekt utworzony z szablonu');
    },
    onError: () => toast.error('Błąd tworzenia projektu z szablonu'),
  });
}
