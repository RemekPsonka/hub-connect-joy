-- Fix numeric field overflow for confidence/score columns
-- Change from NUMERIC(3,2) to NUMERIC(5,2) to allow values 0-100

ALTER TABLE companies 
ALTER COLUMN analysis_confidence_score TYPE NUMERIC(5,2);