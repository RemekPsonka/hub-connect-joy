
-- ============================================
-- FAZA 2.2: Task Dependencies
-- ============================================
CREATE TABLE public.task_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'blocked_by', 'related')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dependencies via task tenant"
  ON public.task_dependencies FOR SELECT
  USING (task_id IN (SELECT id FROM public.tasks WHERE tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())));

CREATE POLICY "Users can create dependencies via task tenant"
  ON public.task_dependencies FOR INSERT
  WITH CHECK (task_id IN (SELECT id FROM public.tasks WHERE tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete dependencies via task tenant"
  ON public.task_dependencies FOR DELETE
  USING (task_id IN (SELECT id FROM public.tasks WHERE tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())));

-- ============================================
-- FAZA 3.2: Task Sections
-- ============================================
CREATE TABLE public.task_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_sections_project_id ON public.task_sections(project_id);

ALTER TABLE public.task_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections in their tenant"
  ON public.task_sections FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can create sections in their tenant"
  ON public.task_sections FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can update sections in their tenant"
  ON public.task_sections FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete sections in their tenant"
  ON public.task_sections FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

-- Add section_id column to tasks
ALTER TABLE public.tasks ADD COLUMN section_id UUID REFERENCES public.task_sections(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_section_id ON public.tasks(section_id);
