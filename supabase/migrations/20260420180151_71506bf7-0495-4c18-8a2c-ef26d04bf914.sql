-- Backfill missing client_status for existing SGU clients
UPDATE public.deal_team_contacts
SET client_status = 'standard'
WHERE category = 'client' AND client_status IS NULL;

-- Default for future inserts
ALTER TABLE public.deal_team_contacts
  ALTER COLUMN client_status SET DEFAULT 'standard';

-- ROLLBACK:
-- ALTER TABLE public.deal_team_contacts ALTER COLUMN client_status DROP DEFAULT;
-- (no row revert — backfill is idempotent and safe)