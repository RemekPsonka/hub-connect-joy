ALTER TABLE public.sgu_settings 
  ADD COLUMN IF NOT EXISTS enable_sgu_prospecting_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_sgu_reports boolean NOT NULL DEFAULT false;
-- ROLLBACK: ALTER TABLE public.sgu_settings DROP COLUMN enable_sgu_prospecting_ai, DROP COLUMN enable_sgu_reports;