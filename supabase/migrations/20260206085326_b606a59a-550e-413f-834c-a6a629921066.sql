-- =====================================================
-- TABELA: deal_team_contacts
-- Główna tabela operacyjna modułu "Zespół Deals"
-- =====================================================

CREATE TABLE deal_team_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- Kategoria w pipeline zespołu
  category TEXT NOT NULL DEFAULT 'lead',
  
  -- Status kontaktu dealowego
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Kto odpowiada za ten kontakt w zespole
  assigned_to UUID,
  
  -- Priorytet
  priority TEXT DEFAULT 'medium',
  
  -- Najbliższe spotkanie
  next_meeting_date TIMESTAMPTZ,
  next_meeting_with UUID,
  
  -- Następna akcja
  next_action TEXT,
  next_action_date DATE,
  next_action_owner UUID,
  
  -- Powiązanie z deal (opcjonalne)
  deal_id UUID,
  
  -- Wartość
  estimated_value NUMERIC,
  value_currency TEXT DEFAULT 'PLN',
  
  -- Notatki
  notes TEXT,
  
  -- Cotygodniowy status tracking
  last_status_update TIMESTAMPTZ,
  -- Obliczane przez trigger (zamiast GENERATED, bo NOW() nie jest immutable)
  status_overdue BOOLEAN DEFAULT true,
  
  -- Metadata
  category_changed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Jeden kontakt może być w danym zespole tylko raz
  UNIQUE(team_id, contact_id)
);

-- =====================================================
-- RLS: Dostęp tylko dla członków zespołu
-- =====================================================

ALTER TABLE deal_team_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dtc_select" ON deal_team_contacts FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND is_deal_team_member(team_id)
  );

CREATE POLICY "dtc_insert" ON deal_team_contacts FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND is_deal_team_member(team_id)
  );

CREATE POLICY "dtc_update" ON deal_team_contacts FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_deal_team_member(team_id)
  );

CREATE POLICY "dtc_delete" ON deal_team_contacts FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND is_deal_team_member(team_id)
  );

-- =====================================================
-- TRIGGER: Auto-update updated_at + status_overdue
-- =====================================================

CREATE OR REPLACE FUNCTION update_deal_team_contact_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Oblicz status_overdue: true jeśli last_status_update jest NULL lub starsze niż 7 dni
  NEW.status_overdue = (
    NEW.last_status_update IS NULL
    OR NEW.last_status_update < now() - INTERVAL '7 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_dtc_before_insert
  BEFORE INSERT ON deal_team_contacts
  FOR EACH ROW EXECUTE FUNCTION update_deal_team_contact_fields();

CREATE TRIGGER trg_dtc_before_update
  BEFORE UPDATE ON deal_team_contacts
  FOR EACH ROW EXECUTE FUNCTION update_deal_team_contact_fields();

-- =====================================================
-- INDEKSY
-- =====================================================

-- Główne filtrowanie: zespół + kategoria (Kanban kolumny)
CREATE INDEX idx_dtc_team_category ON deal_team_contacts(team_id, category);

-- Filtrowanie po osobie odpowiedzialnej
CREATE INDEX idx_dtc_team_assigned ON deal_team_contacts(team_id, assigned_to);

-- Szybkie znalezienie przeterminowanych statusów
CREATE INDEX idx_dtc_status_overdue ON deal_team_contacts(team_id)
  WHERE status_overdue = true;

-- Najbliższe spotkania (kalendarz)
CREATE INDEX idx_dtc_next_meeting ON deal_team_contacts(next_meeting_date)
  WHERE next_meeting_date IS NOT NULL;

-- Lookup kontaktu (czy kontakt jest w jakimś zespole)
CREATE INDEX idx_dtc_contact ON deal_team_contacts(contact_id);