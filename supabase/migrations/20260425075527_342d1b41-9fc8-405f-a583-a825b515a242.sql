-- ODPRAWA-UX-01: Rozszerzenie milestone_variant CHECK na pełny zestaw K1..K4
-- Pre-flight: 0 rekordów w meeting_decisions (bezpieczne)
ALTER TABLE public.meeting_decisions
  DROP CONSTRAINT IF EXISTS meeting_decisions_milestone_variant_check;

ALTER TABLE public.meeting_decisions
  ADD CONSTRAINT meeting_decisions_milestone_variant_check
  CHECK (milestone_variant IS NULL OR milestone_variant IN ('k1','k2','k2+','k3','k4'));

-- ROLLBACK:
-- ALTER TABLE public.meeting_decisions DROP CONSTRAINT meeting_decisions_milestone_variant_check;
-- ALTER TABLE public.meeting_decisions ADD CONSTRAINT meeting_decisions_milestone_variant_check
--   CHECK (milestone_variant IS NULL OR milestone_variant IN ('k2','k2+'));