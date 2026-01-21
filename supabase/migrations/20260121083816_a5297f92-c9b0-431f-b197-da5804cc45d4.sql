-- Add missing columns for Stage 1 data verification
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pkd_codes TEXT[];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_status TEXT DEFAULT 'unknown';