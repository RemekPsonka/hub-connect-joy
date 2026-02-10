
-- =============================================
-- FAZA 2.1: Custom Fields
-- =============================================
CREATE TABLE public.task_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- text, number, date, select, url, checkbox
  options JSONB, -- for select type: [{label, value}]
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.task_custom_fields FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())
);

CREATE TABLE public.task_custom_field_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.task_custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, field_id)
);

ALTER TABLE public.task_custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.task_custom_field_values FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())
);

-- =============================================
-- FAZA 4.1: Automation Rules
-- =============================================
CREATE TABLE public.task_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- status_changed, due_date_passed, all_subtasks_completed
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL, -- change_status, change_priority, assign_to, notify
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.task_automation_rules FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())
);

-- =============================================
-- FAZA 6.4: Saved Views
-- =============================================
CREATE TABLE public.saved_task_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  director_id UUID NOT NULL REFERENCES public.directors(id),
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_task_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_views" ON public.saved_task_views FOR ALL USING (
  director_id IN (SELECT id FROM public.directors WHERE user_id = auth.uid())
);

-- =============================================
-- FAZA 6.5: Activity Log
-- =============================================
CREATE TABLE public.task_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.directors(id),
  action TEXT NOT NULL, -- created, status_changed, priority_changed, assigned, comment_added, etc.
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.task_activity_log FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())
);

-- Activity log trigger on task updates
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_director_id UUID;
BEGIN
  SELECT id INTO v_director_id FROM public.directors WHERE user_id = auth.uid() LIMIT 1;
  
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.task_activity_log (task_id, actor_id, action, old_value, new_value, tenant_id)
    VALUES (NEW.id, v_director_id, 'status_changed', OLD.status, NEW.status, NEW.tenant_id);
  END IF;
  
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.task_activity_log (task_id, actor_id, action, old_value, new_value, tenant_id)
    VALUES (NEW.id, v_director_id, 'priority_changed', OLD.priority, NEW.priority, NEW.tenant_id);
  END IF;
  
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.task_activity_log (task_id, actor_id, action, old_value, new_value, tenant_id)
    VALUES (NEW.id, v_director_id, 'assigned', OLD.assigned_to::text, NEW.assigned_to::text, NEW.tenant_id);
  END IF;
  
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO public.task_activity_log (task_id, actor_id, action, old_value, new_value, tenant_id)
    VALUES (NEW.id, v_director_id, 'title_changed', OLD.title, NEW.title, NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_task_changes_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_changes();

-- =============================================
-- FAZA 3.4: Template Data column
-- =============================================
ALTER TABLE public.project_templates ADD COLUMN IF NOT EXISTS template_data JSONB;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_id ON public.task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_custom_field_values_task_id ON public.task_custom_field_values(task_id);
CREATE INDEX IF NOT EXISTS idx_saved_task_views_director_id ON public.saved_task_views(director_id);
