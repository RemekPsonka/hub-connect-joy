-- Zmiana ai_analysis z TEXT na JSONB (lepsze queryowanie)
-- Najpierw tworzymy nową kolumnę JSONB
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS ai_analysis_jsonb JSONB;

-- Kopiujemy dane z TEXT do JSONB (jeśli są poprawnym JSON)
UPDATE companies 
SET ai_analysis_jsonb = CASE 
  WHEN ai_analysis IS NOT NULL 
    AND ai_analysis != '' 
    AND ai_analysis ~ '^\s*[\{\[]' 
  THEN ai_analysis::jsonb 
  ELSE NULL 
END
WHERE ai_analysis IS NOT NULL;

-- Usuwamy starą kolumnę TEXT
ALTER TABLE companies DROP COLUMN IF EXISTS ai_analysis;

-- Zmieniamy nazwę nowej kolumny na ai_analysis
ALTER TABLE companies RENAME COLUMN ai_analysis_jsonb TO ai_analysis;

-- Nowe kolumny dla metadanych analizy
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS company_analysis_status TEXT 
    DEFAULT 'not_started';

-- Dodajemy CHECK constraint osobno (bezpieczniej)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_analysis_status_check'
  ) THEN
    ALTER TABLE companies 
      ADD CONSTRAINT companies_analysis_status_check 
      CHECK (company_analysis_status IN ('not_started', 'pending', 'in_progress', 'completed', 'failed'));
  END IF;
END $$;

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS company_analysis_date TIMESTAMPTZ;

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS analysis_confidence_score DECIMAL(3,2);

-- Dodajemy CHECK constraint dla confidence score
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_confidence_score_check'
  ) THEN
    ALTER TABLE companies 
      ADD CONSTRAINT companies_confidence_score_check 
      CHECK (analysis_confidence_score >= 0 AND analysis_confidence_score <= 1);
  END IF;
END $$;

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS analysis_data_sources JSONB DEFAULT '{}';

ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS analysis_missing_sections TEXT[] DEFAULT '{}';

-- Indeksy dla szybkiego queryowania
CREATE INDEX IF NOT EXISTS idx_companies_analysis_status 
  ON companies(company_analysis_status);

CREATE INDEX IF NOT EXISTS idx_companies_confidence_score 
  ON companies(analysis_confidence_score);

-- GIN index dla JSONB search
CREATE INDEX IF NOT EXISTS idx_companies_ai_analysis_gin 
  ON companies USING GIN(ai_analysis jsonb_path_ops);

-- Indeksy dla konkretnych pól w JSON
CREATE INDEX IF NOT EXISTS idx_companies_analysis_industry 
  ON companies((ai_analysis->>'industry'));

CREATE INDEX IF NOT EXISTS idx_companies_analysis_revenue 
  ON companies(((ai_analysis->'revenue'->>'amount')::numeric));

CREATE INDEX IF NOT EXISTS idx_companies_analysis_employees 
  ON companies((ai_analysis->>'employee_count'));