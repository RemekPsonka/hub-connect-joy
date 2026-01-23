-- Drop the CHECK constraint that limits confidence_score values
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_confidence_score_check;