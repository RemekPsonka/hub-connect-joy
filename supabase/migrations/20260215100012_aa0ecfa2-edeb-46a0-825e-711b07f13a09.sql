
-- Workspace schedule: maps day_of_week to project per director
CREATE TABLE public.workspace_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  director_id UUID NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (director_id, day_of_week)
);

ALTER TABLE public.workspace_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule"
  ON public.workspace_schedule FOR SELECT
  USING (director_id = public.get_current_director_id());

CREATE POLICY "Users can insert own schedule"
  ON public.workspace_schedule FOR INSERT
  WITH CHECK (director_id = public.get_current_director_id() AND tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can update own schedule"
  ON public.workspace_schedule FOR UPDATE
  USING (director_id = public.get_current_director_id());

CREATE POLICY "Users can delete own schedule"
  ON public.workspace_schedule FOR DELETE
  USING (director_id = public.get_current_director_id());

CREATE TRIGGER update_workspace_schedule_updated_at
  BEFORE UPDATE ON public.workspace_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project links: external resources per project
CREATE TABLE public.project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  created_by UUID REFERENCES public.directors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view project links"
  ON public.project_links FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Directors can insert project links"
  ON public.project_links FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Directors can delete own project links"
  ON public.project_links FOR DELETE
  USING (created_by = public.get_current_director_id());

-- Workspace topics: discussion topics per project
CREATE TABLE public.workspace_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.directors(id),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view topics"
  ON public.workspace_topics FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Directors can insert topics"
  ON public.workspace_topics FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Authors can update own topics"
  ON public.workspace_topics FOR UPDATE
  USING (author_id = public.get_current_director_id());

CREATE POLICY "Authors can delete own topics"
  ON public.workspace_topics FOR DELETE
  USING (author_id = public.get_current_director_id());
