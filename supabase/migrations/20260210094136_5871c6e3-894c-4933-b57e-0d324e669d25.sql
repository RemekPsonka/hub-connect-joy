
-- ============================================================
-- FAZA 2.4 + 2.6 + 3.5 + 4.2: Nowe tabele, kolumny, triggery
-- ============================================================

-- 1. task_notifications
CREATE TABLE public.task_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  director_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('assigned', 'comment_added', 'status_changed', 'due_soon', 'overdue')),
  title TEXT NOT NULL,
  message TEXT,
  read_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_notifications_director ON public.task_notifications(director_id, read_at);
CREATE INDEX idx_task_notifications_tenant ON public.task_notifications(tenant_id);
CREATE INDEX idx_task_notifications_task ON public.task_notifications(task_id);

ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task notifications"
  ON public.task_notifications FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "System can insert task notifications"
  ON public.task_notifications FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can update own task notifications"
  ON public.task_notifications FOR UPDATE
  USING (tenant_id = public.get_current_tenant_id() AND director_id = public.get_current_director_id());

CREATE POLICY "Users can delete own task notifications"
  ON public.task_notifications FOR DELETE
  USING (tenant_id = public.get_current_tenant_id() AND director_id = public.get_current_director_id());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_notifications;

-- 2. task_time_entries
CREATE TABLE public.task_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  director_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_time_entries_task ON public.task_time_entries(task_id);
CREATE INDEX idx_task_time_entries_tenant ON public.task_time_entries(tenant_id);

ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view time entries in tenant"
  ON public.task_time_entries FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "Users can insert own time entries"
  ON public.task_time_entries FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant_id() AND director_id = public.get_current_director_id());

CREATE POLICY "Users can update own time entries"
  ON public.task_time_entries FOR UPDATE
  USING (tenant_id = public.get_current_tenant_id() AND director_id = public.get_current_director_id());

CREATE POLICY "Users can delete own time entries"
  ON public.task_time_entries FOR DELETE
  USING (tenant_id = public.get_current_tenant_id() AND director_id = public.get_current_director_id());

-- 3. New columns on projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS due_date DATE;

-- 4. New column on tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- 5. Trigger: on task comment added -> notify task owner
CREATE OR REPLACE FUNCTION public.notify_on_task_comment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_task RECORD;
  v_commenter_name TEXT;
  v_current_director_id UUID;
BEGIN
  SELECT id, title, owner_id, tenant_id INTO v_task
  FROM public.tasks WHERE id = NEW.task_id;

  IF v_task IS NULL THEN RETURN NEW; END IF;

  v_current_director_id := (SELECT id FROM public.directors WHERE user_id = auth.uid() LIMIT 1);

  -- Don't notify yourself
  IF v_task.owner_id = v_current_director_id THEN RETURN NEW; END IF;
  IF v_task.owner_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO v_commenter_name FROM public.directors WHERE id = v_current_director_id;

  INSERT INTO public.task_notifications (task_id, director_id, type, title, message, tenant_id)
  VALUES (
    NEW.task_id,
    v_task.owner_id,
    'comment_added',
    'Nowy komentarz: ' || LEFT(v_task.title, 50),
    COALESCE(v_commenter_name, 'Ktoś') || ' skomentował zadanie',
    v_task.tenant_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_comment_notify
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_comment();

-- 6. Trigger: on task status change -> notify assigned_to
CREATE OR REPLACE FUNCTION public.notify_on_task_status_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_notify_director_id UUID;
  v_changer_name TEXT;
  v_current_director_id UUID;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  v_current_director_id := (SELECT id FROM public.directors WHERE user_id = auth.uid() LIMIT 1);

  -- Notify assigned_to if different from changer, else notify owner
  v_notify_director_id := CASE
    WHEN NEW.assigned_to IS NOT NULL AND NEW.assigned_to != v_current_director_id THEN NEW.assigned_to
    WHEN NEW.owner_id IS NOT NULL AND NEW.owner_id != v_current_director_id THEN NEW.owner_id
    ELSE NULL
  END;

  IF v_notify_director_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO v_changer_name FROM public.directors WHERE id = v_current_director_id;

  INSERT INTO public.task_notifications (task_id, director_id, type, title, message, tenant_id)
  VALUES (
    NEW.id,
    v_notify_director_id,
    'status_changed',
    'Status zmieniony: ' || LEFT(NEW.title, 50),
    COALESCE(v_changer_name, 'Ktoś') || ' zmienił status na "' || NEW.status || '"',
    NEW.tenant_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_status_notify
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_status_change();

-- 7. Trigger: handle recurring task -> create new task on completion
CREATE OR REPLACE FUNCTION public.handle_recurring_task()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_rule JSONB;
  v_frequency TEXT;
  v_interval INT;
  v_new_due DATE;
  v_new_start DATE;
  v_end_date DATE;
BEGIN
  -- Only fire when status changes to 'completed'
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status != 'completed' THEN RETURN NEW; END IF;
  IF NEW.recurrence_rule IS NULL THEN RETURN NEW; END IF;

  v_rule := NEW.recurrence_rule;
  v_frequency := v_rule->>'frequency';
  v_interval := COALESCE((v_rule->>'interval')::INT, 1);
  v_end_date := (v_rule->>'endDate')::DATE;

  -- Calculate new due date
  IF NEW.due_date IS NOT NULL THEN
    v_new_due := CASE v_frequency
      WHEN 'daily' THEN NEW.due_date + (v_interval || ' days')::INTERVAL
      WHEN 'weekly' THEN NEW.due_date + (v_interval * 7 || ' days')::INTERVAL
      WHEN 'monthly' THEN NEW.due_date + (v_interval || ' months')::INTERVAL
      WHEN 'yearly' THEN NEW.due_date + (v_interval || ' years')::INTERVAL
      ELSE NULL
    END;
  ELSE
    v_new_due := CASE v_frequency
      WHEN 'daily' THEN CURRENT_DATE + (v_interval || ' days')::INTERVAL
      WHEN 'weekly' THEN CURRENT_DATE + (v_interval * 7 || ' days')::INTERVAL
      WHEN 'monthly' THEN CURRENT_DATE + (v_interval || ' months')::INTERVAL
      WHEN 'yearly' THEN CURRENT_DATE + (v_interval || ' years')::INTERVAL
      ELSE NULL
    END;
  END IF;

  IF v_new_due IS NULL THEN RETURN NEW; END IF;
  IF v_end_date IS NOT NULL AND v_new_due > v_end_date THEN RETURN NEW; END IF;

  -- Create new task
  INSERT INTO public.tasks (
    title, description, status, priority, due_date, owner_id, assigned_to,
    project_id, category_id, section_id, milestone_id, tenant_id, recurrence_rule
  )
  VALUES (
    NEW.title, NEW.description, 'pending', NEW.priority, v_new_due,
    NEW.owner_id, NEW.assigned_to, NEW.project_id, NEW.category_id,
    NEW.section_id, NEW.milestone_id, NEW.tenant_id, NEW.recurrence_rule
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_recurring_task
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_recurring_task();
