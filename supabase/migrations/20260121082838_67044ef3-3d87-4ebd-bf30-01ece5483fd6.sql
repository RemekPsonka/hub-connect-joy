-- Etap 1: Dane źródłowe (API) - KRS, CEIDG, basic Perplexity
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_data_api JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_data_status TEXT DEFAULT 'pending';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source_data_date TIMESTAMPTZ;

-- Etap 2: Dane z WWW (Firecrawl scraping)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS www_data JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS www_data_status TEXT DEFAULT 'pending';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS www_data_date TIMESTAMPTZ;

-- Etap 3: Analiza External (Perplexity deep search)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS external_data JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS external_data_status TEXT DEFAULT 'pending';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS external_data_date TIMESTAMPTZ;

-- Etap 4: Dane finansowe (3 lata)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS financial_data_3y JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS financial_data_status TEXT DEFAULT 'pending';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS financial_data_date TIMESTAMPTZ;

-- Etap 5 używa istniejących kolumn: ai_analysis, company_analysis_status, company_analysis_date