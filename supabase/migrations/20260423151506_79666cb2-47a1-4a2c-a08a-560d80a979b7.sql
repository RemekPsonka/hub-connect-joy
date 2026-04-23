-- ============================================================================
-- BLOK 2 — Milestones K1-K4 (deal_team_contacts)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CZĘŚĆ A — Drift fix: k1_meeting_done_at
-- Kolumna istnieje w live (używana przez apply_meeting_decision() w
-- 20260422171024 i 20260422172920), ale nigdy nie była ADD COLUMN w migracji.
-- Bez tego `supabase db reset` wywala trigger.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS k1_meeting_done_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- CZĘŚĆ B — Nowe kolumny K2-K4
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS handshake_at    timestamptz,
  ADD COLUMN IF NOT EXISTS poa_signed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS audit_done_at   timestamptz,
  ADD COLUMN IF NOT EXISTS won_at          timestamptz;

COMMENT ON COLUMN public.deal_team_contacts.k1_meeting_done_at IS
  'K1 — pierwsze spotkanie odbyte (meeting_done stage). Stemplowane w apply_meeting_decision() i set_milestone_timestamps jako fallback.';
COMMENT ON COLUMN public.deal_team_contacts.handshake_at IS
  'K2a — handshake (ustna zgoda) zaakceptowany.';
COMMENT ON COLUMN public.deal_team_contacts.poa_signed_at IS
  'K2b — pełnomocnictwo podpisane (power_of_attorney stage). Decisive moment dla K2.';
COMMENT ON COLUMN public.deal_team_contacts.audit_done_at IS
  'K3 — audyt domknięty (audit_done stage).';
COMMENT ON COLUMN public.deal_team_contacts.won_at IS
  'K4 — kontakt wygrany (won stage). lost_at zostaje niezależnym wymiarem (patrz 20260420103133).';

-- ─────────────────────────────────────────────────────────────────────────────
-- CZĘŚĆ C — Trigger set_milestone_timestamps
-- BEFORE UPDATE OF offering_stage. COALESCE → idempotent (pierwsze wejście
-- wygrywa, ręcznie wpisana data historyczna zostaje). POA implikuje handshake.
-- Koegzystuje z apply_meeting_decision() (różne triggery, różne tabele,
-- oba używają COALESCE na k1_meeting_done_at).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_milestone_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.offering_stage IS DISTINCT FROM OLD.offering_stage THEN
    IF NEW.offering_stage = 'meeting_done' THEN
      NEW.k1_meeting_done_at := COALESCE(NEW.k1_meeting_done_at, now());
    ELSIF NEW.offering_stage = 'handshake' THEN
      NEW.handshake_at       := COALESCE(NEW.handshake_at, now());
    ELSIF NEW.offering_stage = 'power_of_attorney' THEN
      -- POA implikuje wcześniejszy handshake (biznesowo nie da się podpisać
      -- pełnomocnictwa bez wcześniejszej zgody) — stempluj oba.
      NEW.handshake_at       := COALESCE(NEW.handshake_at, now());
      NEW.poa_signed_at      := COALESCE(NEW.poa_signed_at, now());
    ELSIF NEW.offering_stage = 'audit_done' THEN
      NEW.audit_done_at      := COALESCE(NEW.audit_done_at, now());
    ELSIF NEW.offering_stage = 'won' THEN
      NEW.won_at             := COALESCE(NEW.won_at, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_milestone_timestamps ON public.deal_team_contacts;
CREATE TRIGGER trg_set_milestone_timestamps
  BEFORE UPDATE OF offering_stage ON public.deal_team_contacts
  FOR EACH ROW
  WHEN (NEW.offering_stage IS DISTINCT FROM OLD.offering_stage)
  EXECUTE FUNCTION public.set_milestone_timestamps();

-- ─────────────────────────────────────────────────────────────────────────────
-- CZĘŚĆ D — Backfill best-effort
-- Idempotent (COALESCE + IS NULL guard). Używa kaskadowego fallbacku:
-- last_status_update → updated_at → created_at.
-- Każdy K-poziom inkluzywnie obejmuje wszystkie późniejsze stage'e.
-- ─────────────────────────────────────────────────────────────────────────────

-- D1: K1 — meeting_done i wszystkie późniejsze (handshake implikuje wcześniejsze K1)
UPDATE public.deal_team_contacts
SET k1_meeting_done_at = COALESCE(k1_meeting_done_at, last_status_update, updated_at, created_at)
WHERE offering_stage IN ('meeting_done','handshake','power_of_attorney','audit_plan','audit_scheduled','audit_done','offer_sent','negotiation','won')
  AND k1_meeting_done_at IS NULL;

-- D2: K2a handshake — handshake i dalej
UPDATE public.deal_team_contacts
SET handshake_at = COALESCE(handshake_at, last_status_update, updated_at, created_at)
WHERE offering_stage IN ('handshake','power_of_attorney','audit_plan','audit_scheduled','audit_done','offer_sent','negotiation','won')
  AND handshake_at IS NULL;

-- D3: K2b POA — power_of_attorney i dalej
UPDATE public.deal_team_contacts
SET poa_signed_at = COALESCE(poa_signed_at, last_status_update, updated_at, created_at)
WHERE offering_stage IN ('power_of_attorney','audit_plan','audit_scheduled','audit_done','offer_sent','negotiation','won')
  AND poa_signed_at IS NULL;

-- D4: K3 audit_done — audit_done i dalej
UPDATE public.deal_team_contacts
SET audit_done_at = COALESCE(audit_done_at, last_status_update, updated_at, created_at)
WHERE offering_stage IN ('audit_done','offer_sent','negotiation','won')
  AND audit_done_at IS NULL;

-- D5: K4 won
UPDATE public.deal_team_contacts
SET won_at = COALESCE(won_at, last_status_update, updated_at, created_at)
WHERE offering_stage = 'won'
  AND won_at IS NULL;

-- Info-log z licznikami po backfillu
DO $$
DECLARE r record;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE k1_meeting_done_at IS NOT NULL) AS k1,
    COUNT(*) FILTER (WHERE handshake_at      IS NOT NULL) AS k2a,
    COUNT(*) FILTER (WHERE poa_signed_at     IS NOT NULL) AS k2b,
    COUNT(*) FILTER (WHERE audit_done_at     IS NOT NULL) AS k3,
    COUNT(*) FILTER (WHERE won_at            IS NOT NULL) AS k4
    INTO r
  FROM public.deal_team_contacts;
  RAISE NOTICE 'BLOK 2 backfill: K1=% K2a=% K2b=% K3=% K4=%', r.k1, r.k2a, r.k2b, r.k3, r.k4;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (do ręcznego odpalenia w razie potrzeby):
-- ─────────────────────────────────────────────────────────────────────────────
-- DROP TRIGGER IF EXISTS trg_set_milestone_timestamps ON public.deal_team_contacts;
-- DROP FUNCTION IF EXISTS public.set_milestone_timestamps();
-- ALTER TABLE public.deal_team_contacts
--   DROP COLUMN IF EXISTS handshake_at,
--   DROP COLUMN IF EXISTS poa_signed_at,
--   DROP COLUMN IF EXISTS audit_done_at,
--   DROP COLUMN IF EXISTS won_at;
-- -- UWAGA: k1_meeting_done_at NIE jest droppowane — istniało w live przed BLOK 2.
