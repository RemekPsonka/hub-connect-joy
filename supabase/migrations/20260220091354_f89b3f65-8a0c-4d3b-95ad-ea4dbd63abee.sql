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
  
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO public.task_activity_log (task_id, actor_id, action, old_value, new_value, tenant_id)
    VALUES (NEW.id, v_director_id, 'due_date_changed', OLD.due_date::text, NEW.due_date::text, NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;