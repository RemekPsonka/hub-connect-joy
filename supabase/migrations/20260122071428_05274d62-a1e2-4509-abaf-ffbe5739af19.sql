-- Dodaj kolumnę industry do tabeli companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT;

COMMENT ON COLUMN companies.industry IS 'Główna branża firmy, automatycznie mapowana z PKD';

-- Dodaj indeks dla filtrowania po branży
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry) WHERE industry IS NOT NULL;