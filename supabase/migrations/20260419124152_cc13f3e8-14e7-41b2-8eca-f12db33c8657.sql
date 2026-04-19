-- Sprint SGU-02 — Documentation comments + DB-level idempotency
-- Data: 2026-04-19

COMMENT ON COLUMN public.deal_team_contacts.source_contact_id IS
  'Reference to originating CRM contact. NOT NULL = rekord przyszedl z CRM przez edge fn sgu-push-contact. Dane kontaktowe wyswietlane tylko przez RPC rpc_sgu_get_crm_contact_basic (reference-only, audit log w audit_crm_contact_reads).';

COMMENT ON COLUMN public.deal_team_contacts.expected_annual_premium_gr IS
  'Oczekiwany roczny przypis w groszach (PLN x 100). Ustawiany przy push z CRM przez edge fn sgu-push-contact lub recznie w SGU UI.';

-- DB-level idempotency for sgu-push-contact (race-safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dtc_source_unique_per_team
  ON public.deal_team_contacts (team_id, source_contact_id)
  WHERE source_contact_id IS NOT NULL;

-- ROLLBACK:
--   DROP INDEX IF EXISTS public.idx_dtc_source_unique_per_team;
--   COMMENT ON COLUMN public.deal_team_contacts.source_contact_id IS NULL;
--   COMMENT ON COLUMN public.deal_team_contacts.expected_annual_premium_gr IS NULL;