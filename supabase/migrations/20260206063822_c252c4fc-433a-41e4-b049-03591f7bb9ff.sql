-- Create deal_products table
CREATE TABLE public.deal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient deal-based queries
CREATE INDEX idx_deal_products_deal ON public.deal_products(deal_id);

-- Enable RLS
ALTER TABLE public.deal_products ENABLE ROW LEVEL SECURITY;

-- RLS policy - access through deal's tenant
CREATE POLICY "tenant_access" ON public.deal_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  );