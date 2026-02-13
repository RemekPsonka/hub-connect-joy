
-- ===========================================
-- ETAP 2: Integracja lejka z ofertowaniem
-- ===========================================

-- 1. Dodanie 'offering' do enum wartości w deal_team_contacts (kolumna category jest text, więc wystarczy)
-- Nic do zmiany w schemacie - category to text.

-- 2. Powiązanie insurance_policies z lejkiem sprzedaży
ALTER TABLE public.insurance_policies
  ADD COLUMN IF NOT EXISTS deal_team_contact_id UUID REFERENCES public.deal_team_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_team_id UUID REFERENCES public.deal_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_insurance_policies_deal_team_contact ON public.insurance_policies(deal_team_contact_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_deal_team ON public.insurance_policies(deal_team_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_contact ON public.insurance_policies(contact_id);

-- 3. Nowa tabela: harmonogram płatności (payment_schedule)
CREATE TABLE IF NOT EXISTS public.deal_team_payment_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_contact_id UUID NOT NULL REFERENCES public.deal_team_contacts(id) ON DELETE CASCADE,
  client_product_id UUID REFERENCES public.deal_team_client_products(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  scheduled_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PLN',
  description TEXT,
  payment_type TEXT NOT NULL DEFAULT 'recurring', -- 'recurring', 'one_time', 'lump_sum'
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeksy
CREATE INDEX idx_payment_schedule_team_contact ON public.deal_team_payment_schedule(team_contact_id);
CREATE INDEX idx_payment_schedule_team ON public.deal_team_payment_schedule(team_id);
CREATE INDEX idx_payment_schedule_date ON public.deal_team_payment_schedule(scheduled_date);

-- RLS
ALTER TABLE public.deal_team_payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_schedule_select" ON public.deal_team_payment_schedule
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.is_tenant_admin(auth.uid(), tenant_id)
      OR public.is_deal_team_member(team_id)
    )
  );

CREATE POLICY "payment_schedule_insert" ON public.deal_team_payment_schedule
  FOR INSERT WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.is_deal_team_member(team_id)
  );

CREATE POLICY "payment_schedule_update" ON public.deal_team_payment_schedule
  FOR UPDATE USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.is_tenant_admin(auth.uid(), tenant_id)
      OR public.is_deal_team_member(team_id)
    )
  );

CREATE POLICY "payment_schedule_delete" ON public.deal_team_payment_schedule
  FOR DELETE USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.is_tenant_admin(auth.uid(), tenant_id)
      OR public.is_deal_team_member(team_id)
    )
  );

-- Trigger updated_at
CREATE TRIGGER update_payment_schedule_updated_at
  BEFORE UPDATE ON public.deal_team_payment_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Rozszerzenie prognoz z 12 do 24 miesięcy (bez zmiany schematu - month_offset to integer, UI decyduje o zakresie)

-- 5. Rozszerzenie deal_team_client_products o daty kontraktu
ALTER TABLE public.deal_team_client_products
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS contract_duration_months INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS offering_start_date DATE,
  ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL;

-- Indeks
CREATE INDEX IF NOT EXISTS idx_client_products_policy ON public.deal_team_client_products(policy_id);
