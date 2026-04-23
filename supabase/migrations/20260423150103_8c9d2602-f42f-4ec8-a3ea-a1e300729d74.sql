-- ============================================================
-- BLOK 1 / CZĘŚĆ C — B-FIX.13 backfill + UPDATE propagation
-- ============================================================

-- C1: backfill (no-op przy obecnym count=0, ale zostaje na przyszłość)
UPDATE public.tasks t
SET assigned_to = dtc.assigned_to
FROM public.deal_team_contacts dtc
WHERE t.deal_team_contact_id = dtc.id
  AND t.assigned_to IS NULL
  AND t.status != 'completed'
  AND dtc.assigned_to IS NOT NULL;

DO $$
DECLARE v_remaining int;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM public.tasks t
  JOIN public.deal_team_contacts dtc ON dtc.id = t.deal_team_contact_id
  WHERE t.assigned_to IS NULL
    AND t.status != 'completed'
    AND dtc.assigned_to IS NOT NULL;
  RAISE NOTICE 'B-FIX.13 backfill: pozostale tasks bez assigned_to (powinno byc 0): %', v_remaining;
END $$;

-- C2: funkcja propagująca opiekuna z DTC na otwarte taski
CREATE OR REPLACE FUNCTION public.propagate_assigned_to_to_open_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    UPDATE public.tasks
    SET assigned_to = NEW.assigned_to
    WHERE deal_team_contact_id = NEW.id
      AND status != 'completed';
  END IF;
  RETURN NEW;
END;
$$;

-- C2: trigger AFTER UPDATE OF assigned_to
DROP TRIGGER IF EXISTS trg_propagate_assigned_to ON public.deal_team_contacts;
CREATE TRIGGER trg_propagate_assigned_to
  AFTER UPDATE OF assigned_to ON public.deal_team_contacts
  FOR EACH ROW
  WHEN (NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
  EXECUTE FUNCTION public.propagate_assigned_to_to_open_tasks();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_propagate_assigned_to ON public.deal_team_contacts;
-- DROP FUNCTION IF EXISTS public.propagate_assigned_to_to_open_tasks();