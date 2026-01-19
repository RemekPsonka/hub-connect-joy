-- Create ownership_stakes table for tracking company ownership
CREATE TABLE public.ownership_stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ownership_percent NUMERIC(5,2),
  role TEXT DEFAULT 'owner',
  added_by TEXT DEFAULT 'manual',
  revenue_share NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  UNIQUE(contact_id, company_id)
);

-- Create indexes for better performance
CREATE INDEX idx_ownership_stakes_contact ON public.ownership_stakes(contact_id);
CREATE INDEX idx_ownership_stakes_company ON public.ownership_stakes(company_id);
CREATE INDEX idx_ownership_stakes_tenant ON public.ownership_stakes(tenant_id);

-- Enable RLS
ALTER TABLE public.ownership_stakes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant ownership stakes"
ON public.ownership_stakes
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert ownership stakes for their tenant"
ON public.ownership_stakes
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their tenant ownership stakes"
ON public.ownership_stakes
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their tenant ownership stakes"
ON public.ownership_stakes
FOR DELETE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  )
);

-- Add is_owner column to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT false;

-- Add total_ownership_revenue column to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS total_ownership_revenue NUMERIC;