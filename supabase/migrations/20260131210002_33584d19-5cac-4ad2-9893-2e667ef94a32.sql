-- Table 1: pipeline_kpi_targets - Cele KPI (roczne/miesięczne)
CREATE TABLE public.pipeline_kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER, -- NULL = cel roczny, 1-12 = cel miesięczny
  
  -- Cele składkowe
  target_premium NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Cele prowizyjne
  target_commission NUMERIC(15,2),
  target_commission_rate NUMERIC(5,2), -- % średnia prowizja
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, year, month)
);

-- Table 2: insurance_products - Katalog produktów ubezpieczeniowych
CREATE TABLE public.insurance_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- property, liability, fleet, etc.
  subcategory VARCHAR(100),
  
  default_commission_rate NUMERIC(5,2),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, code)
);

-- Table 3: policy_production_records - Rekordy produkcji miesięcznej
CREATE TABLE public.policy_production_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  -- Okres
  production_year INTEGER NOT NULL,
  production_month INTEGER NOT NULL CHECK (production_month BETWEEN 1 AND 12),
  
  -- Produkt
  product_id UUID REFERENCES public.insurance_products(id) ON DELETE SET NULL,
  product_category VARCHAR(50),
  
  -- Składka
  forecasted_premium NUMERIC(15,2) DEFAULT 0,
  actual_premium NUMERIC(15,2) DEFAULT 0,
  
  -- Prowizja
  commission_rate NUMERIC(5,2),
  forecasted_commission NUMERIC(15,2) DEFAULT 0,
  actual_commission NUMERIC(15,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid')),
  invoice_date DATE,
  payment_date DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rozszerzenie insurance_policies o dane finansowe
ALTER TABLE public.insurance_policies 
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.insurance_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS forecasted_premium NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS actual_premium NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS forecasted_commission NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS actual_commission NUMERIC(15,2);

-- Enable RLS on new tables
ALTER TABLE public.pipeline_kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_production_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pipeline_kpi_targets
CREATE POLICY "pipeline_kpi_targets_tenant_access" ON public.pipeline_kpi_targets
  FOR ALL USING (
    auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
  );

-- RLS Policies for insurance_products
CREATE POLICY "insurance_products_tenant_access" ON public.insurance_products
  FOR ALL USING (
    auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
  );

-- RLS Policies for policy_production_records
CREATE POLICY "policy_production_records_tenant_access" ON public.policy_production_records
  FOR ALL USING (
    auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id()
  );

-- Create indexes for better performance
CREATE INDEX idx_kpi_targets_tenant_year ON public.pipeline_kpi_targets(tenant_id, year);
CREATE INDEX idx_production_records_period ON public.policy_production_records(tenant_id, production_year, production_month);
CREATE INDEX idx_production_records_policy ON public.policy_production_records(policy_id);
CREATE INDEX idx_insurance_products_category ON public.insurance_products(tenant_id, category);