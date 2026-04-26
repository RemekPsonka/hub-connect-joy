-- Sprint S1: Auto-assign assigned_to_user_id + require director guard
-- ROLLBACK at bottom

-- 1. Extended auto-assign function (copy assigned_to from DTC + lookup user_id from directors)
CREATE OR REPLACE FUNCTION public.auto_assign_deal_team_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignee uuid;
  v_user_id uuid;
BEGIN
  IF NEW.deal_team_contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Step 1: copy assigned_to from DTC if missing
  IF NEW.assigned_to IS NULL THEN
    SELECT assigned_to INTO v_assignee
    FROM public.deal_team_contacts
    WHERE id = NEW.deal_team_contact_id;
    IF v_assignee IS NOT NULL THEN
      NEW.assigned_to := v_assignee;
    END IF;
  END IF;

  -- Step 2: derive assigned_to_user_id from directors.user_id
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to_user_id IS NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.directors
    WHERE id = NEW.assigned_to;
    IF v_user_id IS NOT NULL THEN
      NEW.assigned_to_user_id := v_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_assign_deal_team_task_trigger ON public.tasks;
CREATE TRIGGER auto_assign_deal_team_task_trigger
BEFORE INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_deal_team_task();

-- 2. Guard: require director on DTC tasks
CREATE OR REPLACE FUNCTION public.require_director_on_dtc_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dtc_assignee uuid;
  v_contact_name text;
BEGIN
  IF NEW.deal_team_contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT dtc.assigned_to,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), c.company_name, 'kontakt')
  INTO v_dtc_assignee, v_contact_name
  FROM public.deal_team_contacts dtc
  LEFT JOIN public.contacts c ON c.id = dtc.contact_id
  WHERE dtc.id = NEW.deal_team_contact_id;

  IF v_dtc_assignee IS NULL THEN
    RAISE EXCEPTION 'Kontakt "%" nie ma przypisanego dyrektora. Przypisz dyrektora przed dodaniem zadania.',
      COALESCE(v_contact_name, 'kontakt') USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_director_on_dtc_task_trigger ON public.tasks;
CREATE TRIGGER require_director_on_dtc_task_trigger
BEFORE INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.require_director_on_dtc_task();

-- 3. Backfill historical rows (idempotent)
UPDATE public.tasks t
SET assigned_to_user_id = d.user_id
FROM public.directors d
WHERE t.assigned_to = d.id
  AND t.assigned_to_user_id IS NULL
  AND t.status NOT IN ('completed', 'cancelled');

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS auto_assign_deal_team_task_trigger ON public.tasks;
-- DROP TRIGGER IF EXISTS require_director_on_dtc_task_trigger ON public.tasks;
-- DROP FUNCTION IF EXISTS public.require_director_on_dtc_task();
-- (auto_assign_deal_team_task() preserved — old version still works)