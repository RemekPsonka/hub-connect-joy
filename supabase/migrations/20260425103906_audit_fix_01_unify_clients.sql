-- AUDIT-FIX-01: ujednolicenie statusów klientów + sync potential_*_gr → client_complexity.*_active
-- Backup: archive.dtc_unify_status_20260425
-- ROLLBACK:
--   UPDATE public.deal_team_contacts dtc SET status = b.status, client_complexity = b.client_complexity
--   FROM archive.dtc_unify_status_20260425 b WHERE dtc.id = b.id;

CREATE SCHEMA IF NOT EXISTS archive;
DROP TABLE IF EXISTS archive.dtc_unify_status_20260425;
CREATE TABLE archive.dtc_unify_status_20260425 AS
  SELECT * FROM public.deal_team_contacts WHERE category = 'client';

-- 1) Wszystkie klienci 'active' → 'won' (jednolity status)
UPDATE public.deal_team_contacts
SET status = 'won'
WHERE category = 'client' AND status = 'active';

-- 2) Sync potential_*_gr → client_complexity.*_active (zachowaj referrals/references counts)
UPDATE public.deal_team_contacts
SET client_complexity = jsonb_build_object(
  'property_active',      COALESCE(potential_property_gr, 0) > 0,
  'financial_active',     COALESCE(potential_financial_gr, 0) > 0,
  'communication_active', COALESCE(potential_communication_gr, 0) > 0,
  'life_group_active',    COALESCE(potential_life_group_gr, 0) > 0,
  'referrals_count',      COALESCE((client_complexity->>'referrals_count')::int, 0),
  'references_count',     COALESCE((client_complexity->>'references_count')::int, 0)
)
WHERE category = 'client';
