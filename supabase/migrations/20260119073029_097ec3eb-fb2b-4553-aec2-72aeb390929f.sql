-- Add missing columns to companies table
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_form TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS revenue_amount BIGINT,
  ADD COLUMN IF NOT EXISTS revenue_year INTEGER,
  ADD COLUMN IF NOT EXISTS revenue_currency TEXT DEFAULT 'PLN',
  ADD COLUMN IF NOT EXISTS growth_rate DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Add check constraint for company_size
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_company_size_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_company_size_check 
  CHECK (company_size IS NULL OR company_size IN ('micro', 'small', 'medium', 'large'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_companies_company_size ON public.companies(company_size);
CREATE INDEX IF NOT EXISTS idx_companies_revenue_amount ON public.companies(revenue_amount);
CREATE INDEX IF NOT EXISTS idx_companies_short_name ON public.companies(short_name);