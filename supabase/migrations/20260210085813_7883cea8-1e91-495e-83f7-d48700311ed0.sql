
-- Create project_milestones table
CREATE TABLE public.project_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add milestone_id to tasks
ALTER TABLE public.tasks ADD COLUMN milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view milestones in their tenant"
  ON public.project_milestones FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can create milestones in their tenant"
  ON public.project_milestones FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can update milestones in their tenant"
  ON public.project_milestones FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete milestones in their tenant"
  ON public.project_milestones FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

-- Index
CREATE INDEX idx_milestones_project ON public.project_milestones(project_id);
CREATE INDEX idx_tasks_milestone ON public.tasks(milestone_id);
