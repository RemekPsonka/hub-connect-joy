
-- 1. handle_recurring_task: auto-create next task when recurring task is completed
CREATE OR REPLACE FUNCTION public.handle_recurring_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_freq TEXT;
  v_interval INT;
  v_new_due DATE;
BEGIN
  IF OLD.status IS DISTINCT FROM 'completed'
     AND NEW.status = 'completed'
     AND NEW.recurrence_rule IS NOT NULL THEN

    v_freq := NEW.recurrence_rule->>'frequency';
    v_interval := COALESCE((NEW.recurrence_rule->>'interval')::int, 1);

    IF NEW.due_date IS NOT NULL THEN
      CASE v_freq
        WHEN 'daily'   THEN v_new_due := NEW.due_date + (v_interval || ' days')::interval;
        WHEN 'weekly'  THEN v_new_due := NEW.due_date + (v_interval * 7 || ' days')::interval;
        WHEN 'monthly' THEN v_new_due := NEW.due_date + (v_interval || ' months')::interval;
        ELSE v_new_due := NEW.due_date + (v_interval || ' days')::interval;
      END CASE;
    ELSE
      CASE v_freq
        WHEN 'daily'   THEN v_new_due := CURRENT_DATE + (v_interval || ' days')::interval;
        WHEN 'weekly'  THEN v_new_due := CURRENT_DATE + (v_interval * 7 || ' days')::interval;
        WHEN 'monthly' THEN v_new_due := CURRENT_DATE + (v_interval || ' months')::interval;
        ELSE v_new_due := CURRENT_DATE + (v_interval || ' days')::interval;
      END CASE;
    END IF;

    INSERT INTO public.tasks (
      tenant_id, title, description, priority, status, due_date,
      project_id, section_id, owner_id, assigned_to,
      recurrence_rule, source_task_id, task_type, visibility, milestone_id
    ) VALUES (
      NEW.tenant_id, NEW.title, NEW.description, NEW.priority, 'pending', v_new_due,
      NEW.project_id, NEW.section_id, NEW.owner_id, NEW.assigned_to,
      NEW.recurrence_rule, NEW.id, NEW.task_type, NEW.visibility, NEW.milestone_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_recurring_task_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_recurring_task();

-- 2. on_task_comment_notify: notify owner & assignee on new comment
CREATE OR REPLACE FUNCTION public.on_task_comment_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_msg TEXT;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_msg := LEFT(NEW.content, 120);

  -- Notify owner (if not the comment author)
  IF v_task.owner_id IS NOT NULL AND v_task.owner_id IS DISTINCT FROM NEW.author_id THEN
    INSERT INTO public.task_notifications (task_id, director_id, type, title, message, tenant_id)
    VALUES (NEW.task_id, v_task.owner_id, 'comment_added', 'Nowy komentarz', v_msg, NEW.tenant_id);
  END IF;

  -- Notify assignee (if different from owner and author)
  IF v_task.assigned_to IS NOT NULL
     AND v_task.assigned_to IS DISTINCT FROM NEW.author_id
     AND v_task.assigned_to IS DISTINCT FROM v_task.owner_id THEN
    INSERT INTO public.task_notifications (task_id, director_id, type, title, message, tenant_id)
    VALUES (NEW.task_id, v_task.assigned_to, 'comment_added', 'Nowy komentarz', v_msg, NEW.tenant_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_comment_notify_trigger
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_task_comment_notify();

-- 3. on_task_status_notify: notify owner & assignee on status change
CREATE OR REPLACE FUNCTION public.on_task_status_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg TEXT;
BEGIN
  v_msg := NEW.title || ': ' || COALESCE(OLD.status, '?') || ' → ' || NEW.status;

  -- Notify owner
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.task_notifications (task_id, director_id, type, title, message, tenant_id)
    VALUES (NEW.id, NEW.owner_id, 'status_changed', 'Zmiana statusu zadania', v_msg, NEW.tenant_id);
  END IF;

  -- Notify assignee (if different from owner)
  IF NEW.assigned_to IS NOT NULL
     AND NEW.assigned_to IS DISTINCT FROM NEW.owner_id THEN
    INSERT INTO public.task_notifications (task_id, director_id, type, title, message, tenant_id)
    VALUES (NEW.id, NEW.assigned_to, 'status_changed', 'Zmiana statusu zadania', v_msg, NEW.tenant_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_status_notify_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.on_task_status_notify();
