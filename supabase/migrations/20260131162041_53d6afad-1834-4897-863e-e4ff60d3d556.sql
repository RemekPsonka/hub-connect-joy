-- Create exposure_locations table for Multi-Site Exposure Manager
CREATE TABLE public.exposure_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Location details
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  
  -- Activity type (critical for risk assessment)
  activity_type TEXT NOT NULL CHECK (
    activity_type IN ('production', 'warehouse', 'office', 'retail')
  ),
  
  -- Construction type
  construction_type TEXT NOT NULL DEFAULT 'non_combustible' CHECK (
    construction_type IN ('non_combustible', 'combustible')
  ),
  
  -- Values (stored in PLN)
  building_value NUMERIC DEFAULT 0,
  machinery_value NUMERIC DEFAULT 0,
  stock_value NUMERIC DEFAULT 0,
  stock_fluctuation BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_exposure_locations_company ON public.exposure_locations(company_id);
CREATE INDEX idx_exposure_locations_tenant ON public.exposure_locations(tenant_id);

-- Enable Row Level Security
ALTER TABLE public.exposure_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant-based access
CREATE POLICY "exposure_locations_tenant_access"
  ON public.exposure_locations
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
CREATE TRIGGER update_exposure_locations_updated_at
  BEFORE UPDATE ON public.exposure_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();