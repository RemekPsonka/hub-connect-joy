-- =====================================================
-- PROMPT 5.4: deal_team_assignments + deal_team_activity_log + trigger
-- Ostatnie 2 tabele modułu Zespół Deals (7/7 KOMPLET)
-- =====================================================

-- =====================================================
-- TABELA 1: deal_team_assignments
-- Lekkie zadania operacyjne dla członków zespołu
-- =====================================================

CREATE TABLE public.deal_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_contact_id UUID NOT NULL,
  team_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  
  assigned_to UUID NOT NULL,
  assigned_by UUID NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deal_team_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dta_select" ON public.deal_team_assignments FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE POLICY "dta_insert" ON public.deal_team_assignments FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE POLICY "dta_update" ON public.deal_team_assignments FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE POLICY "dta_delete" ON public.deal_team_assignments FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE INDEX idx_dta_assigned ON public.deal_team_assignments(assigned_to, status);
CREATE INDEX idx_dta_contact ON public.deal_team_assignments(team_contact_id);
CREATE INDEX idx_dta_team_pending ON public.deal_team_assignments(team_id)
  WHERE status IN ('pending', 'in_progress');

-- =====================================================
-- TABELA 2: deal_team_activity_log
-- Append-only log aktywności (bez UPDATE/DELETE)
-- =====================================================

CREATE TABLE public.deal_team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  
  team_contact_id UUID,
  prospect_id UUID,
  
  actor_id UUID NOT NULL,
  
  action TEXT NOT NULL,
  
  old_value JSONB,
  new_value JSONB,
  
  note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deal_team_activity_log ENABLE ROW LEVEL SECURITY;

-- Tylko SELECT i INSERT — log jest append-only
CREATE POLICY "dtal_select" ON public.deal_team_activity_log FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE POLICY "dtal_insert" ON public.deal_team_activity_log FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

-- BRAK polityk UPDATE i DELETE — log jest niezmienny

CREATE INDEX idx_dtal_team ON public.deal_team_activity_log(team_id, created_at DESC);
CREATE INDEX idx_dtal_contact ON public.deal_team_activity_log(team_contact_id, created_at DESC)
  WHERE team_contact_id IS NOT NULL;
CREATE INDEX idx_dtal_prospect ON public.deal_team_activity_log(prospect_id, created_at DESC)
  WHERE prospect_id IS NOT NULL;

-- =====================================================
-- TRIGGER: Automatyczne logowanie zmian kategorii
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_deal_category_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.category IS DISTINCT FROM NEW.category THEN
    INSERT INTO public.deal_team_activity_log
      (team_id, tenant_id, team_contact_id, actor_id, action, old_value, new_value)
    VALUES
      (NEW.team_id, NEW.tenant_id, NEW.id,
       get_current_director_id(), 'category_changed',
       jsonb_build_object('category', OLD.category),
       jsonb_build_object('category', NEW.category));
    NEW.category_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_dtc_category
  BEFORE UPDATE ON public.deal_team_contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_deal_category_change();