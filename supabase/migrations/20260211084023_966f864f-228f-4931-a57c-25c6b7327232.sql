
-- 1. Product categories per team
CREATE TABLE public.deal_team_product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  default_commission_percent NUMERIC DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_team_product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view product categories"
  ON public.deal_team_product_categories FOR SELECT
  USING (is_deal_team_member(team_id));

CREATE POLICY "Team members can insert product categories"
  ON public.deal_team_product_categories FOR INSERT
  WITH CHECK (is_deal_team_member(team_id));

CREATE POLICY "Team members can update product categories"
  ON public.deal_team_product_categories FOR UPDATE
  USING (is_deal_team_member(team_id));

CREATE POLICY "Team members can delete product categories"
  ON public.deal_team_product_categories FOR DELETE
  USING (is_deal_team_member(team_id));

CREATE INDEX idx_deal_team_product_categories_team ON public.deal_team_product_categories(team_id);

-- 2. Client/Lead products (linking contacts to product categories with values)
CREATE TABLE public.deal_team_client_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  team_contact_id UUID NOT NULL REFERENCES public.deal_team_contacts(id) ON DELETE CASCADE,
  product_category_id UUID NOT NULL REFERENCES public.deal_team_product_categories(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  deal_value NUMERIC NOT NULL DEFAULT 0,
  expected_commission NUMERIC NOT NULL DEFAULT 0,
  commission_percent NUMERIC NOT NULL DEFAULT 0,
  probability_percent INT NOT NULL DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_team_client_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view client products"
  ON public.deal_team_client_products FOR SELECT
  USING (is_deal_team_member(team_id));

CREATE POLICY "Team members can insert client products"
  ON public.deal_team_client_products FOR INSERT
  WITH CHECK (is_deal_team_member(team_id));

CREATE POLICY "Team members can update client products"
  ON public.deal_team_client_products FOR UPDATE
  USING (is_deal_team_member(team_id));

CREATE POLICY "Team members can delete client products"
  ON public.deal_team_client_products FOR DELETE
  USING (is_deal_team_member(team_id));

CREATE INDEX idx_deal_team_client_products_contact ON public.deal_team_client_products(team_contact_id);
CREATE INDEX idx_deal_team_client_products_category ON public.deal_team_client_products(product_category_id);

CREATE TRIGGER update_client_products_updated_at
  BEFORE UPDATE ON public.deal_team_client_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Revenue forecasts (monthly distribution)
CREATE TABLE public.deal_team_revenue_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_product_id UUID NOT NULL REFERENCES public.deal_team_client_products(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  month_offset INT NOT NULL,
  month_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_product_id, month_offset)
);

ALTER TABLE public.deal_team_revenue_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view forecasts"
  ON public.deal_team_revenue_forecasts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deal_team_client_products cp
      WHERE cp.id = client_product_id AND is_deal_team_member(cp.team_id)
    )
  );

CREATE POLICY "Team members can insert forecasts"
  ON public.deal_team_revenue_forecasts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deal_team_client_products cp
      WHERE cp.id = client_product_id AND is_deal_team_member(cp.team_id)
    )
  );

CREATE POLICY "Team members can update forecasts"
  ON public.deal_team_revenue_forecasts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.deal_team_client_products cp
      WHERE cp.id = client_product_id AND is_deal_team_member(cp.team_id)
    )
  );

CREATE POLICY "Team members can delete forecasts"
  ON public.deal_team_revenue_forecasts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.deal_team_client_products cp
      WHERE cp.id = client_product_id AND is_deal_team_member(cp.team_id)
    )
  );

CREATE INDEX idx_deal_team_revenue_forecasts_product ON public.deal_team_revenue_forecasts(client_product_id);

CREATE TRIGGER update_revenue_forecasts_updated_at
  BEFORE UPDATE ON public.deal_team_revenue_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
