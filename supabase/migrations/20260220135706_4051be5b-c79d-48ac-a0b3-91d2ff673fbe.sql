
-- Fix existing pending tasks to use 'todo'
UPDATE public.tasks SET status = 'todo' WHERE status = 'pending';

-- Recreate handle_recurring_task to use 'todo' status and copy task_contacts
CREATE OR REPLACE FUNCTION public.handle_recurring_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_freq TEXT;
  v_interval INT;
  v_new_due DATE;
  v_new_task_id UUID;
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
      NEW.tenant_id, NEW.title, NEW.description, NEW.priority, 'todo', v_new_due,
      NEW.project_id, NEW.section_id, NEW.owner_id, NEW.assigned_to,
      NEW.recurrence_rule, NEW.id, NEW.task_type, NEW.visibility, NEW.milestone_id
    )
    RETURNING id INTO v_new_task_id;

    -- Copy task_contacts from completed task to new recurring task
    INSERT INTO public.task_contacts (task_id, contact_id, role)
    SELECT v_new_task_id, tc.contact_id, tc.role
    FROM public.task_contacts tc
    WHERE tc.task_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;
