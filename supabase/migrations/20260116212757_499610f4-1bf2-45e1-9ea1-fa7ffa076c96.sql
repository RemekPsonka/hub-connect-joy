-- Add missing columns to cross_tasks for workflow tracking
ALTER TABLE cross_tasks 
ADD COLUMN IF NOT EXISTS suggested_intro TEXT,
ADD COLUMN IF NOT EXISTS discussed_with_a BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discussed_with_a_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS discussed_with_b BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discussed_with_b_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS intro_made_at TIMESTAMPTZ;