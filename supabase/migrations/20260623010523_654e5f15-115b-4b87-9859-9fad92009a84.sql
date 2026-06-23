-- Wycięcie pól-duchów z deal_team_contacts: deal_stage (duplikat category) i representative_user_id (zawsze NULL).
-- Kolumny RENAME do deprecated_*_20260623; fizyczny DROP w osobnej migracji po >=30 dniach.
-- Trigger trg_enforce_next_action i jego funkcja enforce_next_action_required były martwym no-op (warunek nigdy true).

DROP TRIGGER IF EXISTS trg_enforce_next_action ON public.deal_team_contacts;
DROP FUNCTION IF EXISTS public.enforce_next_action_required();

DROP INDEX IF EXISTS public.idx_dtc_team_stage;
DROP INDEX IF EXISTS public.idx_dtc_rep;

ALTER TABLE public.deal_team_contacts
  RENAME COLUMN deal_stage TO deprecated_deal_stage_20260623;

ALTER TABLE public.deal_team_contacts
  RENAME COLUMN representative_user_id TO deprecated_representative_user_id_20260623;

-- ROLLBACK:
-- ALTER TABLE public.deal_team_contacts RENAME COLUMN deprecated_deal_stage_20260623 TO deal_stage;
-- ALTER TABLE public.deal_team_contacts RENAME COLUMN deprecated_representative_user_id_20260623 TO representative_user_id;
-- CREATE INDEX IF NOT EXISTS idx_dtc_team_stage ON public.deal_team_contacts (team_id, deal_stage);
-- CREATE INDEX IF NOT EXISTS idx_dtc_rep ON public.deal_team_contacts (representative_user_id);
-- CREATE OR REPLACE FUNCTION public.enforce_next_action_required()
-- RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- BEGIN
--   IF NEW.deal_stage = 'offering' AND NEW.next_action IS NULL THEN
--     RAISE EXCEPTION 'next_action is required when deal_stage = offering';
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
-- CREATE TRIGGER trg_enforce_next_action BEFORE INSERT OR UPDATE ON public.deal_team_contacts
--   FOR EACH ROW EXECUTE FUNCTION public.enforce_next_action_required();
