-- Sync is_lost flag with status='lost' or category='lost' so the
-- "Klienci utraceni" report doesn't miss contacts that were dragged
-- to the Przegrane column on the kanban (which only sets status/category).

-- 1. Backfill existing rows
UPDATE public.deal_team_contacts
   SET is_lost = TRUE,
       lost_at = COALESCE(lost_at, updated_at, now()),
       lost_reason = COALESCE(NULLIF(lost_reason, ''), 'Brak powodu (uzupełnione automatycznie)')
 WHERE is_lost = FALSE
   AND (status = 'lost' OR category = 'lost');

-- 2. Trigger keeping the flag consistent on every write.
CREATE OR REPLACE FUNCTION public.sync_dtc_lost_flag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.status = 'lost' OR NEW.category = 'lost') AND NEW.is_lost IS DISTINCT FROM TRUE THEN
    NEW.is_lost := TRUE;
    IF NEW.lost_at IS NULL THEN
      NEW.lost_at := now();
    END IF;
    IF NEW.lost_reason IS NULL OR NEW.lost_reason = '' THEN
      NEW.lost_reason := 'Brak powodu (auto)';
    END IF;
  END IF;

  -- If somebody explicitly clears is_lost, also clear status/category 'lost'
  IF NEW.is_lost = FALSE AND (OLD IS NULL OR OLD.is_lost IS DISTINCT FROM FALSE) THEN
    IF NEW.status = 'lost' THEN NEW.status := 'active'; END IF;
    IF NEW.category = 'lost' THEN NEW.category := 'cold'; END IF;
    NEW.lost_at := NULL;
    NEW.lost_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_dtc_lost_flag ON public.deal_team_contacts;
CREATE TRIGGER trg_sync_dtc_lost_flag
BEFORE INSERT OR UPDATE ON public.deal_team_contacts
FOR EACH ROW EXECUTE FUNCTION public.sync_dtc_lost_flag();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_sync_dtc_lost_flag ON public.deal_team_contacts;
-- DROP FUNCTION IF EXISTS public.sync_dtc_lost_flag();
