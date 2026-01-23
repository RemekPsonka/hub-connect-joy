-- =============================================
-- MODUŁ "PEŁNE BI" v3 - Business Interview
-- =============================================

-- 1. Główna tabela business_interviews
CREATE TABLE IF NOT EXISTS public.business_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'completed', 'ai_processed', 'approved')),
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Sekcja A: Dane podstawowe (branża, email, telefon, źródło, status relacji, etc.)
  section_a_basic JSONB DEFAULT '{}',
  
  -- Sekcja C: Firma główna - profil (zakres, rynki, produkty, rola, własność)
  section_c_company_profile JSONB DEFAULT '{}',
  
  -- Sekcja D: Skala biznesu i inne biznesy (przychody, EBITDA, pracownicy, inne branże)
  section_d_scale JSONB DEFAULT '{}',
  
  -- Sekcja F: Strategia 2-3 lata (cele, makro, szanse, ryzyka)
  section_f_strategy JSONB DEFAULT '{}',
  
  -- Sekcja G: Potrzeby biznesowe (priorytety, wyzwania, poszukiwania)
  section_g_needs JSONB DEFAULT '{}',
  
  -- Sekcja H: Inwestycje (ostatnie, planowane, brakujące)
  section_h_investments JSONB DEFAULT '{}',
  
  -- Sekcja J: Wartość dla CC (kontakty, know-how, zasoby, ekspertyzy)
  section_j_value_for_cc JSONB DEFAULT '{}',
  
  -- Sekcja K: Zaangażowanie w CC (mentoring, leadership, edukacja, filantropia)
  section_k_engagement JSONB DEFAULT '{}',
  
  -- Sekcja L: Prywatne (miasto, hobby, cele, sukcesja)
  section_l_personal JSONB DEFAULT '{}',
  
  -- Sekcja M: Organizacje/fundacje
  section_m_organizations JSONB DEFAULT '{}',
  
  -- Sekcja N: Follow-up (pytania, spotkania, dokumenty, ustalenia)
  section_n_followup JSONB DEFAULT '{}',
  
  -- Metadata
  filled_by UUID REFERENCES public.directors(id),
  meeting_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla business_interviews
CREATE INDEX IF NOT EXISTS idx_business_interviews_contact ON public.business_interviews(contact_id);
CREATE INDEX IF NOT EXISTS idx_business_interviews_tenant ON public.business_interviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_business_interviews_status ON public.business_interviews(status);

-- RLS dla business_interviews
ALTER TABLE public.business_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bi_select_own_tenant" ON public.business_interviews
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));

CREATE POLICY "bi_insert_own_tenant" ON public.business_interviews
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));

CREATE POLICY "bi_update_own_tenant" ON public.business_interviews
  FOR UPDATE USING (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));

CREATE POLICY "bi_delete_own_tenant" ON public.business_interviews
  FOR DELETE USING (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));

-- Trigger dla updated_at
CREATE TRIGGER update_business_interviews_updated_at
  BEFORE UPDATE ON public.business_interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela bi_ai_outputs (wyniki AI - wersjonowane)
CREATE TABLE IF NOT EXISTS public.bi_ai_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_interview_id UUID NOT NULL REFERENCES public.business_interviews(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Brakujące informacje (pytania AI)
  missing_info JSONB DEFAULT '[]',
  
  -- Potrzeby i oferta (AI)
  needs_offers JSONB DEFAULT '[]',
  
  -- Propozycje zadań (AI)
  task_proposals JSONB DEFAULT '[]',
  
  -- Rekomendacje połączeń (AI)
  connection_recommendations JSONB DEFAULT '[]',
  
  -- Podsumowanie (AI)
  summary JSONB DEFAULT '{}',
  
  processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla bi_ai_outputs
CREATE INDEX IF NOT EXISTS idx_bi_ai_outputs_interview ON public.bi_ai_outputs(business_interview_id);
CREATE INDEX IF NOT EXISTS idx_bi_ai_outputs_tenant ON public.bi_ai_outputs(tenant_id);

-- RLS dla bi_ai_outputs
ALTER TABLE public.bi_ai_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bi_ai_select_own_tenant" ON public.bi_ai_outputs
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));

CREATE POLICY "bi_ai_insert_own_tenant" ON public.bi_ai_outputs
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));

CREATE POLICY "bi_ai_update_own_tenant" ON public.bi_ai_outputs
  FOR UPDATE USING (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));

CREATE POLICY "bi_ai_delete_own_tenant" ON public.bi_ai_outputs
  FOR DELETE USING (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));

-- Trigger dla updated_at
CREATE TRIGGER update_bi_ai_outputs_updated_at
  BEFORE UPDATE ON public.bi_ai_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tabela bi_versions (historia wersji)
CREATE TABLE IF NOT EXISTS public.bi_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_interview_id UUID NOT NULL REFERENCES public.business_interviews(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  ai_output_id UUID REFERENCES public.bi_ai_outputs(id),
  created_by UUID REFERENCES public.directors(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla bi_versions
CREATE INDEX IF NOT EXISTS idx_bi_versions_interview ON public.bi_versions(business_interview_id);
CREATE INDEX IF NOT EXISTS idx_bi_versions_tenant ON public.bi_versions(tenant_id);

-- RLS dla bi_versions
ALTER TABLE public.bi_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bi_versions_select_own_tenant" ON public.bi_versions
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));

CREATE POLICY "bi_versions_insert_own_tenant" ON public.bi_versions
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.directors WHERE user_id = auth.uid()
    UNION
    SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid()
  ));