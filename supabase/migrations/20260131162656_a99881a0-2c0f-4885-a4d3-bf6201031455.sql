-- Create liability_exposure_profiles table for Financial Exposure & Liability DNA module
CREATE TABLE public.liability_exposure_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Total Revenue
  total_annual_revenue NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PLN' CHECK (currency IN ('PLN', 'EUR', 'USD')),
  
  -- Territorial Split (percentages, should sum to 100)
  territory_poland_pct NUMERIC DEFAULT 100,
  territory_eu_oecd_pct NUMERIC DEFAULT 0,
  territory_usa_canada_pct NUMERIC DEFAULT 0,
  territory_rest_world_pct NUMERIC DEFAULT 0,
  
  -- Activity Risk Profile (multi-select)
  activity_manufacturing BOOLEAN DEFAULT false,
  activity_services BOOLEAN DEFAULT false,
  activity_installation BOOLEAN DEFAULT false,
  activity_trading BOOLEAN DEFAULT false,
  
  -- Conditional: Services split (percentage of advisory vs manual work)
  services_advisory_pct NUMERIC,
  
  -- Special Exposures
  exposure_aviation_auto_rail_offshore BOOLEAN DEFAULT false,
  exposure_ecommerce BOOLEAN DEFAULT false,
  b2b_vs_b2c_pct NUMERIC DEFAULT 50,
  
  -- AI Recommendation
  ai_suggested_limit_eur NUMERIC,
  ai_recommendation_reason TEXT,
  ai_generated_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_liability_exposure_company ON public.liability_exposure_profiles(company_id);
CREATE INDEX idx_liability_exposure_tenant ON public.liability_exposure_profiles(tenant_id);

-- Unique constraint: one profile per company
CREATE UNIQUE INDEX idx_liability_exposure_unique_company ON public.liability_exposure_profiles(company_id);

-- Enable RLS
ALTER TABLE public.liability_exposure_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "liability_exposure_tenant_access"
  ON public.liability_exposure_profiles
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND 
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    tenant_id = get_current_tenant_id()
  );

-- Trigger for updated_at
CREATE TRIGGER update_liability_exposure_updated_at
  BEFORE UPDATE ON public.liability_exposure_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();