-- ============================================
-- PROMPT 5.3: deal_team_prospects + deal_team_weekly_statuses
-- ============================================

-- ===========================================
-- 1. TABELA: deal_team_prospects
-- ===========================================
CREATE TABLE deal_team_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- Dane osoby/firmy (mogą nie być w CRM)
  prospect_name TEXT NOT NULL,
  prospect_company TEXT,
  prospect_position TEXT,
  prospect_linkedin TEXT,
  prospect_email TEXT,
  prospect_phone TEXT,
  prospect_notes TEXT,
  
  -- Powiązanie z CRM (opcjonalne)
  contact_id UUID,
  company_id UUID,
  
  -- Dla kogo szukamy
  requested_by UUID NOT NULL,
  requested_for_reason TEXT,
  
  -- Kto szuka
  assigned_to UUID,
  
  -- Status poszukiwania
  status TEXT NOT NULL DEFAULT 'searching',
  
  -- Jak znaleziono
  found_via TEXT,
  intro_contact_id UUID,
  
  -- Priorytet i deadline
  priority TEXT DEFAULT 'medium',
  target_date DATE,
  
  -- Po konwersji
  converted_to_contact_id UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- 2. TABELA: deal_team_weekly_statuses
-- ===========================================
CREATE TABLE deal_team_weekly_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_contact_id UUID NOT NULL,
  team_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  reported_by UUID NOT NULL,
  
  -- Identyfikator tygodnia
  week_start DATE NOT NULL,
  
  -- Treść statusu
  status_summary TEXT NOT NULL,
  next_steps TEXT,
  blockers TEXT,
  
  -- Spotkanie
  meeting_happened BOOLEAN DEFAULT false,
  meeting_outcome TEXT,
  
  -- Rekomendacja
  category_recommendation TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Jeden status na kontakt na tydzień
  UNIQUE(team_contact_id, week_start)
);

-- ===========================================
-- 3. RLS: deal_team_prospects
-- ===========================================
ALTER TABLE deal_team_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dtp_select" ON deal_team_prospects FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE POLICY "dtp_insert" ON deal_team_prospects FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE POLICY "dtp_update" ON deal_team_prospects FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE POLICY "dtp_delete" ON deal_team_prospects FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

-- ===========================================
-- 4. RLS: deal_team_weekly_statuses
-- ===========================================
ALTER TABLE deal_team_weekly_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dtws_select" ON deal_team_weekly_statuses FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE POLICY "dtws_insert" ON deal_team_weekly_statuses FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_deal_team_member(team_id));

CREATE POLICY "dtws_update" ON deal_team_weekly_statuses FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND reported_by = get_current_director_id());

CREATE POLICY "dtws_delete" ON deal_team_weekly_statuses FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND reported_by = get_current_director_id());

-- ===========================================
-- 5. FUNKCJA + TRIGGER: auto-update updated_at dla prospects
-- ===========================================
CREATE OR REPLACE FUNCTION update_deal_team_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_dtp_updated
  BEFORE UPDATE ON deal_team_prospects
  FOR EACH ROW EXECUTE FUNCTION update_deal_team_timestamp();

-- ===========================================
-- 6. FUNKCJA + TRIGGER: auto-update last_status_update w deal_team_contacts
-- ===========================================
CREATE OR REPLACE FUNCTION update_last_status_on_weekly()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deal_team_contacts
  SET last_status_update = now()
  WHERE id = NEW.team_contact_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_dtws_update
  AFTER INSERT ON deal_team_weekly_statuses
  FOR EACH ROW EXECUTE FUNCTION update_last_status_on_weekly();

-- ===========================================
-- 7. INDEKSY: deal_team_prospects
-- ===========================================
CREATE INDEX idx_dtp_team_status ON deal_team_prospects(team_id, status);
CREATE INDEX idx_dtp_assigned ON deal_team_prospects(assigned_to);
CREATE INDEX idx_dtp_requested ON deal_team_prospects(requested_by);

-- ===========================================
-- 8. INDEKSY: deal_team_weekly_statuses
-- ===========================================
CREATE INDEX idx_dtws_team_week ON deal_team_weekly_statuses(team_id, week_start DESC);
CREATE INDEX idx_dtws_contact ON deal_team_weekly_statuses(team_contact_id, week_start DESC);