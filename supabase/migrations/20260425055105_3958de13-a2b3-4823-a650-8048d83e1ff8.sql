BEGIN;

-- A.1 Rozszerzenie CHECK na decision_type
ALTER TABLE public.meeting_decisions
  DROP CONSTRAINT IF EXISTS meeting_decisions_decision_type_check;

ALTER TABLE public.meeting_decisions
  ADD CONSTRAINT meeting_decisions_decision_type_check
  CHECK (decision_type IN ('go','postponed','dead','push','pivot','park','kill'));

-- A.2 milestone_variant
ALTER TABLE public.meeting_decisions
  ADD COLUMN IF NOT EXISTS milestone_variant text
  CHECK (milestone_variant IS NULL OR milestone_variant IN ('k2','k2+'));

-- A.3 FK do odprawa_sessions
ALTER TABLE public.meeting_decisions
  ADD COLUMN IF NOT EXISTS odprawa_session_id uuid
  REFERENCES public.odprawa_sessions(id) ON DELETE SET NULL;

-- A.4 Index
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_odprawa_session
  ON public.meeting_decisions(odprawa_session_id, created_at DESC)
  WHERE odprawa_session_id IS NOT NULL;

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP INDEX IF EXISTS idx_meeting_decisions_odprawa_session;
-- ALTER TABLE public.meeting_decisions DROP COLUMN IF EXISTS odprawa_session_id;
-- ALTER TABLE public.meeting_decisions DROP COLUMN IF EXISTS milestone_variant;
-- ALTER TABLE public.meeting_decisions DROP CONSTRAINT IF EXISTS meeting_decisions_decision_type_check;
-- ALTER TABLE public.meeting_decisions ADD CONSTRAINT meeting_decisions_decision_type_check
--   CHECK (decision_type IN ('go','postponed','dead'));
-- COMMIT;