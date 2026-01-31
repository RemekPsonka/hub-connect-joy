-- Create insurance_policies table for renewal timeline
CREATE TABLE public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Policy details
  policy_type TEXT NOT NULL CHECK (policy_type IN ('property', 'fleet', 'do', 'cyber', 'liability', 'life', 'health', 'other')),
  policy_number TEXT,
  policy_name TEXT NOT NULL,
  insurer_name TEXT,
  broker_name TEXT,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Renewal checklist (JSONB)
  renewal_checklist JSONB DEFAULT '{
    "data_update_requested": false,
    "market_tender_done": false,
    "negotiation_completed": false,
    "board_approval_obtained": false
  }'::jsonb,
  
  -- Financial info
  sum_insured NUMERIC,
  premium NUMERIC,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_insurance_policies_company ON public.insurance_policies(company_id);
CREATE INDEX idx_insurance_policies_tenant ON public.insurance_policies(tenant_id);
CREATE INDEX idx_insurance_policies_end_date ON public.insurance_policies(end_date);

-- Enable RLS
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant access via directors or assistants
CREATE POLICY "insurance_policies_tenant_access"
  ON public.insurance_policies
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
CREATE TRIGGER update_insurance_policies_updated_at
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();