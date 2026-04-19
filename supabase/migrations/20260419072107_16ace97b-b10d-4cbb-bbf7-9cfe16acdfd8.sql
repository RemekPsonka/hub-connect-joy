-- Sprint 18.5 fix — log_task_changes używa audit_log (task_activity_log nie istnieje)
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_director_id UUID;
BEGIN
  SELECT id INTO v_director_id FROM public.directors WHERE user_id = auth.uid() LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (tenant_id, actor_id, entity_type, entity_id, action, diff)
    VALUES (NEW.tenant_id, v_director_id, 'task', NEW.id, 'created', jsonb_build_object('new', NEW.title));
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (tenant_id, actor_id, entity_type, entity_id, action, diff)
    VALUES (NEW.tenant_id, v_director_id, 'task', NEW.id, 'status_changed', jsonb_build_object('old', OLD.status, 'new', NEW.status));
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.audit_log (tenant_id, actor_id, entity_type, entity_id, action, diff)
    VALUES (NEW.tenant_id, v_director_id, 'task', NEW.id, 'priority_changed', jsonb_build_object('old', OLD.priority, 'new', NEW.priority));
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.audit_log (tenant_id, actor_id, entity_type, entity_id, action, diff)
    VALUES (NEW.tenant_id, v_director_id, 'task', NEW.id, 'assigned', jsonb_build_object('old', OLD.assigned_to, 'new', NEW.assigned_to));
  END IF;

  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO public.audit_log (tenant_id, actor_id, entity_type, entity_id, action, diff)
    VALUES (NEW.tenant_id, v_director_id, 'task', NEW.id, 'title_changed', jsonb_build_object('old', OLD.title, 'new', NEW.title));
  END IF;

  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO public.audit_log (tenant_id, actor_id, entity_type, entity_id, action, diff)
    VALUES (NEW.tenant_id, v_director_id, 'task', NEW.id, 'due_date_changed', jsonb_build_object('old', OLD.due_date, 'new', NEW.due_date));
  END IF;

  RETURN NEW;
END;
$function$;

-- ROLLBACK:
-- Przywróć poprzednią wersję funkcji odwołującą się do task_activity_log (psuje UPDATE).