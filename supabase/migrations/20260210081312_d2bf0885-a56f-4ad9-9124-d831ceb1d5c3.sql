
-- ============================================
-- FAZA 2.3: Task Comments
-- ============================================
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_tenant_id ON public.task_comments(tenant_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task comments in their tenant"
  ON public.task_comments FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can create task comments in their tenant"
  ON public.task_comments FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own comments"
  ON public.task_comments FOR UPDATE
  USING (author_id IN (SELECT id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own comments"
  ON public.task_comments FOR DELETE
  USING (author_id IN (SELECT id FROM public.directors WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FAZA 2.5: Task Labels
-- ============================================
CREATE TABLE public.task_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_labels_tenant_id ON public.task_labels(tenant_id);

ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view labels in their tenant"
  ON public.task_labels FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can create labels in their tenant"
  ON public.task_labels FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can update labels in their tenant"
  ON public.task_labels FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete labels in their tenant"
  ON public.task_labels FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()));

-- Junction table
CREATE TABLE public.task_label_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.task_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, label_id)
);

CREATE INDEX idx_task_label_assignments_task_id ON public.task_label_assignments(task_id);
CREATE INDEX idx_task_label_assignments_label_id ON public.task_label_assignments(label_id);

ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view label assignments via task tenant"
  ON public.task_label_assignments FOR SELECT
  USING (task_id IN (SELECT id FROM public.tasks WHERE tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())));

CREATE POLICY "Users can assign labels via task tenant"
  ON public.task_label_assignments FOR INSERT
  WITH CHECK (task_id IN (SELECT id FROM public.tasks WHERE tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())));

CREATE POLICY "Users can remove label assignments via task tenant"
  ON public.task_label_assignments FOR DELETE
  USING (task_id IN (SELECT id FROM public.tasks WHERE tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())));
