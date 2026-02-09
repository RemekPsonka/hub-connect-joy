
-- =============================================
-- WANTED CONTACTS + SHARES
-- =============================================

-- 1. Tabela wanted_contacts
CREATE TABLE public.wanted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by_contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  
  -- Osoba (opcjonalna)
  person_name TEXT,
  person_position TEXT,
  person_email TEXT,
  person_phone TEXT,
  person_linkedin TEXT,
  person_context TEXT,
  
  -- Firma (opcjonalna)
  company_name TEXT,
  company_nip TEXT,
  company_regon TEXT,
  company_industry TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_context TEXT,
  
  -- Kontekst
  search_context TEXT,
  description TEXT,
  notes TEXT,
  
  -- Status
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Matching
  matched_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  matched_by UUID REFERENCES public.directors(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  
  -- Meta
  created_by UUID NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

-- 2. Tabela wanted_contact_shares
CREATE TABLE public.wanted_contact_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wanted_contact_id UUID NOT NULL REFERENCES public.wanted_contacts(id) ON DELETE CASCADE,
  shared_with_director_id UUID REFERENCES public.directors(id) ON DELETE CASCADE,
  shared_with_team_id UUID REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  shared_by_director_id UUID NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indeksy
CREATE INDEX idx_wc_tenant ON wanted_contacts(tenant_id);
CREATE INDEX idx_wc_created_by ON wanted_contacts(created_by);
CREATE INDEX idx_wc_status ON wanted_contacts(status);
CREATE INDEX idx_wc_requested_by ON wanted_contacts(requested_by_contact_id);
CREATE INDEX idx_wc_company_nip ON wanted_contacts(company_nip) WHERE company_nip IS NOT NULL;
CREATE INDEX idx_wcs_wanted ON wanted_contact_shares(wanted_contact_id);
CREATE INDEX idx_wcs_director ON wanted_contact_shares(shared_with_director_id) WHERE shared_with_director_id IS NOT NULL;
CREATE INDEX idx_wcs_team ON wanted_contact_shares(shared_with_team_id) WHERE shared_with_team_id IS NOT NULL;

-- 4. Trigger: przynajmniej person_name lub company_name
CREATE OR REPLACE FUNCTION public.validate_wanted_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.person_name IS NULL AND NEW.company_name IS NULL THEN
    RAISE EXCEPTION 'At least person_name or company_name must be provided';
  END IF;
  
  -- Validate urgency
  IF NEW.urgency NOT IN ('low', 'normal', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid urgency value: %', NEW.urgency;
  END IF;
  
  -- Validate status
  IF NEW.status NOT IN ('active', 'in_progress', 'fulfilled', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status value: %', NEW.status;
  END IF;
  
  NEW.updated_at := now();
  
  IF NEW.status = 'fulfilled' AND OLD.status IS DISTINCT FROM 'fulfilled' THEN
    NEW.fulfilled_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_wanted_contact
  BEFORE INSERT OR UPDATE ON public.wanted_contacts
  FOR EACH ROW EXECUTE FUNCTION public.validate_wanted_contact();

-- 5. Trigger: shares musi mieć director lub team
CREATE OR REPLACE FUNCTION public.validate_wanted_contact_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.shared_with_director_id IS NULL AND NEW.shared_with_team_id IS NULL THEN
    RAISE EXCEPTION 'Either shared_with_director_id or shared_with_team_id must be provided';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_wanted_contact_share
  BEFORE INSERT OR UPDATE ON public.wanted_contact_shares
  FOR EACH ROW EXECUTE FUNCTION public.validate_wanted_contact_share();

-- 6. Funkcja dostępu (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.can_access_wanted_contact(p_wanted_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_created_by UUID;
  v_current_director_id UUID;
BEGIN
  -- Get wanted contact info
  SELECT tenant_id, created_by INTO v_tenant_id, v_created_by
  FROM wanted_contacts WHERE id = p_wanted_id;
  
  IF v_tenant_id IS NULL THEN RETURN FALSE; END IF;
  
  -- Tenant isolation
  IF v_tenant_id != get_current_tenant_id() THEN RETURN FALSE; END IF;
  
  -- Admin always has access
  IF is_tenant_admin(auth.uid(), v_tenant_id) THEN RETURN TRUE; END IF;
  
  v_current_director_id := get_current_director_id();
  
  -- Creator has access
  IF v_created_by = v_current_director_id THEN RETURN TRUE; END IF;
  
  -- Direct share
  IF EXISTS (
    SELECT 1 FROM wanted_contact_shares
    WHERE wanted_contact_id = p_wanted_id
    AND shared_with_director_id = v_current_director_id
  ) THEN RETURN TRUE; END IF;
  
  -- Team share
  IF EXISTS (
    SELECT 1 FROM wanted_contact_shares wcs
    JOIN deal_team_members dtm ON dtm.team_id = wcs.shared_with_team_id
    WHERE wcs.wanted_contact_id = p_wanted_id
    AND dtm.director_id = v_current_director_id
    AND dtm.is_active = true
  ) THEN RETURN TRUE; END IF;
  
  RETURN FALSE;
END;
$$;

-- 7. RLS wanted_contacts
ALTER TABLE public.wanted_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY wc_select ON wanted_contacts FOR SELECT TO authenticated
  USING (can_access_wanted_contact(id));

CREATE POLICY wc_insert ON wanted_contacts FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND created_by = get_current_director_id()
  );

CREATE POLICY wc_update ON wanted_contacts FOR UPDATE TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      created_by = get_current_director_id()
      OR is_tenant_admin(auth.uid(), tenant_id)
    )
  );

CREATE POLICY wc_delete ON wanted_contacts FOR DELETE TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      created_by = get_current_director_id()
      OR is_tenant_admin(auth.uid(), tenant_id)
    )
  );

-- 8. RLS wanted_contact_shares
ALTER TABLE public.wanted_contact_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY wcs_select ON wanted_contact_shares FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      shared_with_director_id = get_current_director_id()
      OR shared_by_director_id = get_current_director_id()
      OR is_tenant_admin(auth.uid(), tenant_id)
      OR EXISTS (
        SELECT 1 FROM deal_team_members dtm
        WHERE dtm.team_id = shared_with_team_id
        AND dtm.director_id = get_current_director_id()
        AND dtm.is_active = true
      )
    )
  );

CREATE POLICY wcs_insert ON wanted_contact_shares FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND shared_by_director_id = get_current_director_id()
    AND EXISTS (
      SELECT 1 FROM wanted_contacts wc
      WHERE wc.id = wanted_contact_id
      AND (wc.created_by = get_current_director_id() OR is_tenant_admin(auth.uid(), wc.tenant_id))
    )
  );

CREATE POLICY wcs_delete ON wanted_contact_shares FOR DELETE TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      shared_by_director_id = get_current_director_id()
      OR is_tenant_admin(auth.uid(), tenant_id)
    )
  );
