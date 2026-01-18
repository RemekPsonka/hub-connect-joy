-- Funkcja do wyszukiwania duplikatów kontaktów
CREATE OR REPLACE FUNCTION public.find_duplicate_contact(
  p_tenant_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
  contact_id UUID,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_full_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_company TEXT,
  contact_position TEXT,
  contact_city TEXT,
  contact_notes TEXT,
  contact_profile_summary TEXT,
  contact_tags TEXT[],
  contact_primary_group_id UUID,
  contact_linkedin_url TEXT,
  contact_source TEXT
) AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_email TEXT;
  v_phone TEXT;
BEGIN
  -- Normalizacja danych wejściowych
  v_first_name := LOWER(TRIM(COALESCE(p_first_name, '')));
  v_last_name := LOWER(TRIM(COALESCE(p_last_name, '')));
  v_email := LOWER(TRIM(COALESCE(p_email, '')));
  v_phone := REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9+]', '', 'g');

  -- Szukaj po imieniu + nazwisku + telefonie
  IF v_phone != '' THEN
    RETURN QUERY
    SELECT c.id, c.first_name, c.last_name, c.full_name, c.email, c.phone,
           c.company, c.position, c.city, c.notes, c.profile_summary,
           c.tags, c.primary_group_id, c.linkedin_url, c.source
    FROM public.contacts c
    WHERE c.tenant_id = p_tenant_id
      AND c.is_active = TRUE
      AND LOWER(TRIM(COALESCE(c.first_name, ''))) = v_first_name
      AND LOWER(TRIM(COALESCE(c.last_name, ''))) = v_last_name
      AND REGEXP_REPLACE(COALESCE(c.phone, ''), '[^0-9+]', '', 'g') = v_phone
    LIMIT 1;
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  -- Szukaj po imieniu + nazwisku + emailu
  IF v_email != '' THEN
    RETURN QUERY
    SELECT c.id, c.first_name, c.last_name, c.full_name, c.email, c.phone,
           c.company, c.position, c.city, c.notes, c.profile_summary,
           c.tags, c.primary_group_id, c.linkedin_url, c.source
    FROM public.contacts c
    WHERE c.tenant_id = p_tenant_id
      AND c.is_active = TRUE
      AND LOWER(TRIM(COALESCE(c.first_name, ''))) = v_first_name
      AND LOWER(TRIM(COALESCE(c.last_name, ''))) = v_last_name
      AND LOWER(TRIM(COALESCE(c.email, ''))) = v_email
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Tabela historii scaleń
CREATE TABLE public.contact_merge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  primary_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  merged_contact_data JSONB NOT NULL,
  ai_integrated_fields TEXT[],
  merge_source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks dla szybkiego wyszukiwania historii
CREATE INDEX idx_contact_merge_history_tenant ON public.contact_merge_history(tenant_id);
CREATE INDEX idx_contact_merge_history_contact ON public.contact_merge_history(primary_contact_id);

-- RLS dla tabeli historii
ALTER TABLE public.contact_merge_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view merge history for their tenant" ON public.contact_merge_history
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid() AND is_active = TRUE
  )
);

CREATE POLICY "Users can insert merge history for their tenant" ON public.contact_merge_history
FOR INSERT WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid() AND is_active = TRUE
  )
);