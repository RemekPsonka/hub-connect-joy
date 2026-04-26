-- Etap 3 cleanup: DROP konkurencyjnego triggera milestone + DROP 5 zdublowanych kolumn dat.
-- Ścieżka A (oba duplikaty obecne w live DB).
-- Canonical zostaje: trg_set_milestone_timestamps + set_milestone_timestamps()
-- Chronione kolumny (NIETKNIĘTE): audit_done_at, k1_meeting_done_at, handshake_at,
--   poa_signed_at, won_at, lost_at, lost_reason
--
-- ROLLBACK:
-- 1) CREATE OR REPLACE FUNCTION public.update_milestone_timestamps()
--      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
--    AS $function$
--    BEGIN
--      IF NEW.offering_stage IS DISTINCT FROM OLD.offering_stage THEN
--        IF NEW.offering_stage IN ('handshake','power_of_attorney','audit','offer_sent','negotiation','won')
--           AND NEW.k2_handshake_at IS NULL THEN
--          NEW.k2_handshake_at := now();
--        END IF;
--        IF NEW.offering_stage IN ('power_of_attorney','audit','offer_sent','negotiation','won')
--           AND NEW.k3_poa_signed_at IS NULL THEN
--          NEW.k3_poa_signed_at := now();
--        END IF;
--        IF NEW.offering_stage IN ('negotiation','won')
--           AND NEW.k4_offer_accepted_at IS NULL THEN
--          NEW.k4_offer_accepted_at := now();
--        END IF;
--        IF NEW.offering_stage = 'won'
--           AND NEW.k4_policy_signed_at IS NULL THEN
--          NEW.k4_policy_signed_at := now();
--        END IF;
--      END IF;
--      RETURN NEW;
--    END;
--    $function$;
-- 2) CREATE TRIGGER trg_milestone_timestamps BEFORE UPDATE ON public.deal_team_contacts
--      FOR EACH ROW EXECUTE FUNCTION public.update_milestone_timestamps();
-- 3) ALTER TABLE public.deal_team_contacts
--      ADD COLUMN k1_meeting_scheduled_at timestamptz,
--      ADD COLUMN k2_handshake_at         timestamptz,
--      ADD COLUMN k3_poa_signed_at        timestamptz,
--      ADD COLUMN k4_offer_accepted_at    timestamptz,
--      ADD COLUMN k4_policy_signed_at     timestamptz;
-- 4) UPDATE public.deal_team_contacts dtc
--      SET k1_meeting_scheduled_at = b.k1_meeting_scheduled_at,
--          k2_handshake_at         = b.k2_handshake_at,
--          k3_poa_signed_at        = b.k3_poa_signed_at,
--          k4_offer_accepted_at    = b.k4_offer_accepted_at,
--          k4_policy_signed_at     = b.k4_policy_signed_at
--      FROM archive.deprecated_milestone_columns_backup_2026_04_25 b
--      WHERE dtc.id = b.deal_team_contact_id;

-- ===== S4a: DROP konkurencyjnego triggera + funkcji =====
DROP TRIGGER IF EXISTS trg_milestone_timestamps ON public.deal_team_contacts;
DROP TRIGGER IF EXISTS update_milestone_timestamps_trigger ON public.deal_team_contacts;
DROP FUNCTION IF EXISTS public.update_milestone_timestamps() CASCADE;

-- ===== S4b: backup + DROP 5 zdublowanych kolumn =====
CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE archive.deprecated_milestone_columns_backup_2026_04_25 AS
SELECT
  id AS deal_team_contact_id,
  k1_meeting_scheduled_at,
  k2_handshake_at,
  k3_poa_signed_at,
  k4_offer_accepted_at,
  k4_policy_signed_at,
  now() AS backed_up_at
FROM public.deal_team_contacts
WHERE k1_meeting_scheduled_at IS NOT NULL
   OR k2_handshake_at IS NOT NULL
   OR k3_poa_signed_at IS NOT NULL
   OR k4_offer_accepted_at IS NOT NULL
   OR k4_policy_signed_at IS NOT NULL;
-- oczekiwane: 23 wiersze backupu

ALTER TABLE public.deal_team_contacts
  DROP COLUMN IF EXISTS k1_meeting_scheduled_at,
  DROP COLUMN IF EXISTS k2_handshake_at,
  DROP COLUMN IF EXISTS k3_poa_signed_at,
  DROP COLUMN IF EXISTS k4_offer_accepted_at,
  DROP COLUMN IF EXISTS k4_policy_signed_at;