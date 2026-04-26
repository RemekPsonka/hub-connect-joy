-- ============================================================
-- Sprint S2 — UNIFY-CONVERT-CLIENT (Etap 2 konsolidacji)
-- ============================================================
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.convert_to_client(uuid, jsonb);
--   UPDATE public.deal_team_contacts dtc SET
--     client_complexity          = b.client_complexity,
--     expected_annual_premium_gr = b.expected_annual_premium_gr,
--     potential_property_gr      = b.potential_property_gr,
--     potential_financial_gr     = b.potential_financial_gr,
--     potential_communication_gr = b.potential_communication_gr,
--     potential_life_group_gr    = b.potential_life_group_gr
--   FROM archive.deprecated_client_complexity_backup_2026_04_25 b
--   WHERE dtc.id = b.deal_team_contact_id;

-- 1. Backup
CREATE SCHEMA IF NOT EXISTS archive;

DROP TABLE IF EXISTS archive.deprecated_client_complexity_backup_2026_04_25;

CREATE TABLE archive.deprecated_client_complexity_backup_2026_04_25 AS
SELECT
  id AS deal_team_contact_id,
  category,
  client_complexity,
  expected_annual_premium_gr,
  potential_property_gr,
  potential_financial_gr,
  potential_communication_gr,
  potential_life_group_gr,
  now() AS backed_up_at
FROM public.deal_team_contacts;

-- 2. RPC convert_to_client
CREATE OR REPLACE FUNCTION public.convert_to_client(
  p_dtc_id uuid,
  p_areas  jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_active      bool := COALESCE((p_areas->'property'->>'active')::bool, false);
  v_financial_active     bool := COALESCE((p_areas->'financial'->>'active')::bool, false);
  v_communication_active bool := COALESCE((p_areas->'communication'->>'active')::bool, false);
  v_life_group_active    bool := COALESCE((p_areas->'life_group'->>'active')::bool, false);

  v_property_premium_gr      bigint := COALESCE(((p_areas->'property'->>'annualPremiumPln')::numeric * 100)::bigint, 0);
  v_financial_premium_gr     bigint := COALESCE(((p_areas->'financial'->>'annualPremiumPln')::numeric * 100)::bigint, 0);
  v_communication_premium_gr bigint := COALESCE(((p_areas->'communication'->>'annualPremiumPln')::numeric * 100)::bigint, 0);
  v_life_group_premium_gr    bigint := COALESCE(((p_areas->'life_group'->>'annualPremiumPln')::numeric * 100)::bigint, 0);

  v_total_premium_gr bigint :=
    (CASE WHEN v_property_active      THEN v_property_premium_gr      ELSE 0 END) +
    (CASE WHEN v_financial_active     THEN v_financial_premium_gr     ELSE 0 END) +
    (CASE WHEN v_communication_active THEN v_communication_premium_gr ELSE 0 END) +
    (CASE WHEN v_life_group_active    THEN v_life_group_premium_gr    ELSE 0 END);
BEGIN
  IF NOT (v_property_active OR v_financial_active OR v_communication_active OR v_life_group_active) THEN
    RAISE EXCEPTION 'Konwersja na klienta wymaga zaznaczenia minimum jednego obszaru.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.deal_team_contacts SET
    category       = 'client',
    won_at         = COALESCE(won_at, now()),
    offering_stage = 'won',
    client_complexity = jsonb_build_object(
      'property_active',      v_property_active,
      'financial_active',     v_financial_active,
      'communication_active', v_communication_active,
      'life_group_active',    v_life_group_active,
      'referrals_count',      COALESCE((client_complexity->>'referrals_count')::int, 0),
      'references_count',     COALESCE((client_complexity->>'references_count')::int, 0)
    ),
    potential_property_gr      = CASE WHEN v_property_active      THEN v_property_premium_gr      ELSE 0 END,
    potential_financial_gr     = CASE WHEN v_financial_active     THEN v_financial_premium_gr     ELSE 0 END,
    potential_communication_gr = CASE WHEN v_communication_active THEN v_communication_premium_gr ELSE 0 END,
    potential_life_group_gr    = CASE WHEN v_life_group_active    THEN v_life_group_premium_gr    ELSE 0 END,
    expected_annual_premium_gr = v_total_premium_gr,
    updated_at = now()
  WHERE id = p_dtc_id;
END;
$$;

-- 3. Backfill istniejących klientów (sync booleanów z bigintami)
UPDATE public.deal_team_contacts SET client_complexity = jsonb_build_object(
  'property_active',      COALESCE((client_complexity->>'property_active')::bool,      potential_property_gr      > 0),
  'financial_active',     COALESCE((client_complexity->>'financial_active')::bool,     potential_financial_gr     > 0),
  'communication_active', COALESCE((client_complexity->>'communication_active')::bool, potential_communication_gr > 0),
  'life_group_active',    COALESCE((client_complexity->>'life_group_active')::bool,    potential_life_group_gr    > 0),
  'referrals_count',      COALESCE((client_complexity->>'referrals_count')::int, 0),
  'references_count',     COALESCE((client_complexity->>'references_count')::int, 0)
)
WHERE category = 'client';