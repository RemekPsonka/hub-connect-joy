-- ===========================================
-- TABELA: deal_stages (etapy pipeline'u)
-- ===========================================
CREATE TABLE public.deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  is_closed_won BOOLEAN DEFAULT false,
  is_closed_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_deal_stages_tenant ON public.deal_stages(tenant_id);
CREATE INDEX idx_deal_stages_position ON public.deal_stages(tenant_id, position);

-- ===========================================
-- TABELA: deals (szanse sprzedaży)
-- ===========================================
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  stage_id UUID NOT NULL REFERENCES public.deal_stages(id),
  probability INTEGER NOT NULL DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  
  owner_id UUID REFERENCES public.directors(id),
  source TEXT, -- 'inbound', 'outbound', 'referral', 'partner'
  
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'won', 'lost'
  won_at TIMESTAMPTZ,
  lost_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT deals_contact_or_company_required 
    CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL)
);

CREATE INDEX idx_deals_tenant ON public.deals(tenant_id);
CREATE INDEX idx_deals_stage ON public.deals(stage_id);
CREATE INDEX idx_deals_contact ON public.deals(contact_id);
CREATE INDEX idx_deals_company ON public.deals(company_id);
CREATE INDEX idx_deals_status ON public.deals(status);
CREATE INDEX idx_deals_owner ON public.deals(owner_id);
CREATE INDEX idx_deals_expected_close ON public.deals(expected_close_date);

-- ===========================================
-- TABELA: deal_activities (historia zmian)
-- ===========================================
CREATE TABLE public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'note', 'stage_change', 'value_change', 'call', 'email', 'meeting'
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  created_by UUID REFERENCES public.directors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deal_activities_deal ON public.deal_activities(deal_id);
CREATE INDEX idx_deal_activities_created_at ON public.deal_activities(created_at);

-- ===========================================
-- RLS (Row Level Security)
-- ===========================================
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

-- Deal stages - dostęp tylko dla swojego tenanta
CREATE POLICY "tenant_access" ON public.deal_stages
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Deals - dostęp tylko dla swojego tenanta
CREATE POLICY "tenant_access" ON public.deals
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Deal activities - przez relację do deals
CREATE POLICY "tenant_access" ON public.deal_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  );

-- ===========================================
-- TRIGGER: updated_at dla deals
-- ===========================================
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- FUNKCJA: Seed domyślnych etapów dla tenanta
-- ===========================================
CREATE OR REPLACE FUNCTION public.seed_deal_stages_for_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.deal_stages (tenant_id, name, position, color, is_closed_won, is_closed_lost) VALUES
    (p_tenant_id, 'Lead', 0, '#94a3b8', false, false),
    (p_tenant_id, 'Kwalifikacja', 1, '#3b82f6', false, false),
    (p_tenant_id, 'Propozycja', 2, '#8b5cf6', false, false),
    (p_tenant_id, 'Negocjacje', 3, '#f59e0b', false, false),
    (p_tenant_id, 'Zamknięty - Wygrany', 4, '#22c55e', true, false),
    (p_tenant_id, 'Zamknięty - Przegrany', 5, '#ef4444', false, true)
  ON CONFLICT (tenant_id, name) DO NOTHING;
END;
$$;