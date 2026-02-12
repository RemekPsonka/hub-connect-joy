
-- Table for recording actual premiums and commissions per month/client/product
CREATE TABLE public.deal_team_actual_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  team_contact_id UUID NOT NULL REFERENCES public.deal_team_contacts(id) ON DELETE CASCADE,
  client_product_id UUID REFERENCES public.deal_team_client_products(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  month_date DATE NOT NULL,
  actual_premium NUMERIC NOT NULL DEFAULT 0,
  actual_commission NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_contact_id, client_product_id, month_date)
);

-- Index for fast lookups
CREATE INDEX idx_actual_commissions_team ON public.deal_team_actual_commissions(team_id);
CREATE INDEX idx_actual_commissions_month ON public.deal_team_actual_commissions(month_date);

-- Enable RLS
ALTER TABLE public.deal_team_actual_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies using deal team membership
CREATE POLICY "Team members can view actual commissions"
  ON public.deal_team_actual_commissions FOR SELECT
  USING (is_deal_team_member(team_id));

CREATE POLICY "Team members can insert actual commissions"
  ON public.deal_team_actual_commissions FOR INSERT
  WITH CHECK (is_deal_team_member(team_id));

CREATE POLICY "Team members can update actual commissions"
  ON public.deal_team_actual_commissions FOR UPDATE
  USING (is_deal_team_member(team_id));

CREATE POLICY "Team members can delete actual commissions"
  ON public.deal_team_actual_commissions FOR DELETE
  USING (is_deal_team_member(team_id));

-- Trigger for updated_at
CREATE TRIGGER update_deal_team_actual_commissions_updated_at
  BEFORE UPDATE ON public.deal_team_actual_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
