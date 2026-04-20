-- SGU-REFACTOR-IA — Krok 1
-- Soft migration: category nietkniete; nowe pola optional; rollback-able.

BEGIN;

-- ============================================================
-- 0. ARCHIWIZACJA przed ALTER offering_stage
-- ============================================================
CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive.deal_team_contacts_offstage_backup_20260420 AS
SELECT id, category, offering_stage, updated_at
FROM public.deal_team_contacts;

-- ============================================================
-- 1. deal_team_contacts — nowe kolumny
-- ============================================================

-- 1.1 deal_stage (generated)
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS deal_stage text GENERATED ALWAYS AS (
    CASE
      WHEN category IN ('lead','hot','top','cold','10x')  THEN 'lead'
      WHEN category IN ('offering','audit')                THEN 'offering'
      WHEN category = 'client'                              THEN 'client'
      WHEN category = 'lost'                                THEN 'lost'
      ELSE 'prospect'
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_dtc_team_stage
  ON public.deal_team_contacts(team_id, deal_stage);

-- 1.2 temperature
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS temperature text
    CHECK (temperature IS NULL OR temperature IN ('hot','top','cold','10x'));

UPDATE public.deal_team_contacts
  SET temperature = category
  WHERE category IN ('hot','top','cold','10x') AND temperature IS NULL;

-- 1.3 prospect_source
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS prospect_source text
    CHECK (prospect_source IS NULL OR prospect_source IN ('crm_push','cc_meeting','ai_krs','ai_web','csv','manual'));

-- 1.4 client_status
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS client_status text DEFAULT 'standard'
    CHECK (client_status IN ('standard','ambassador','lost'));

-- 1.5 4 Obszary sprzedazy
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS potential_property_gr bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potential_financial_gr bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potential_communication_gr bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potential_life_group_gr bigint DEFAULT 0;

-- 1.6 is_lost flag
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS is_lost boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_dtc_is_lost
  ON public.deal_team_contacts(team_id, is_lost)
  WHERE is_lost = true;

-- 1.7 client_complexity
ALTER TABLE public.deal_team_contacts
  ADD COLUMN IF NOT EXISTS client_complexity jsonb DEFAULT jsonb_build_object(
    'property_active', false,
    'financial_active', false,
    'communication_active', false,
    'life_group_active', false,
    'referrals_count', 0,
    'references_count', 0
  );

-- 1.8 offering_stage CHECK z 8 wartosciami
UPDATE public.deal_team_contacts SET offering_stage = 'offer_sent'
  WHERE offering_stage = 'preparation';

UPDATE public.deal_team_contacts SET offering_stage = 'won'
  WHERE offering_stage = 'accepted';

ALTER TABLE public.deal_team_contacts
  DROP CONSTRAINT IF EXISTS deal_team_contacts_offering_stage_check;

ALTER TABLE public.deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_offering_stage_check
  CHECK (offering_stage IS NULL OR offering_stage IN (
    'decision_meeting','handshake','power_of_attorney','audit',
    'offer_sent','negotiation','won','lost'
  ));

-- ============================================================
-- 2. client_referrals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  referrer_deal_team_contact_id uuid NOT NULL
    REFERENCES public.deal_team_contacts(id) ON DELETE CASCADE,
  referred_deal_team_contact_id uuid
    REFERENCES public.deal_team_contacts(id) ON DELETE SET NULL,
  referred_name text NOT NULL,
  referred_phone text,
  referred_email text,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','added','rejected')),
  created_at timestamptz DEFAULT now(),
  created_by_user_id uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_cr_referrer ON public.client_referrals(referrer_deal_team_contact_id);
CREATE INDEX IF NOT EXISTS idx_cr_status   ON public.client_referrals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cr_tenant   ON public.client_referrals(tenant_id);

ALTER TABLE public.client_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_referrals_tenant_isolation" ON public.client_referrals;
CREATE POLICY "client_referrals_tenant_isolation" ON public.client_referrals
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ============================================================
-- 3. Trigger auto-ambasador (>= 3 polecenia 'added')
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_client_status_on_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'added' THEN
    UPDATE public.deal_team_contacts
      SET client_status = 'ambassador'
      WHERE id = NEW.referrer_deal_team_contact_id
        AND client_status = 'standard'
        AND (
          SELECT COUNT(*) FROM public.client_referrals
            WHERE referrer_deal_team_contact_id = NEW.referrer_deal_team_contact_id
              AND status = 'added'
        ) >= 3;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cr_ambassador_check ON public.client_referrals;
CREATE TRIGGER trg_cr_ambassador_check
  AFTER INSERT OR UPDATE OF status ON public.client_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_client_status_on_referral();

COMMIT;