-- ============================================
-- BI INTERVIEW SYSTEM
-- ============================================

-- Contact BI Data (strukturalne dane z wywiadu)
CREATE TABLE public.contact_bi_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  
  -- Strukturalne dane z wywiadu (6 sekcji)
  bi_profile JSONB DEFAULT '{}'::jsonb,
  
  -- Metryki
  completeness_score DECIMAL(3,2) DEFAULT 0.00,
  last_bi_update TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  interviewer_name TEXT,
  
  -- Status: 'incomplete', 'in_progress', 'complete'
  bi_status TEXT DEFAULT 'incomplete',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact BI History (audit trail zmian)
CREATE TABLE public.contact_bi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_bi_id UUID REFERENCES public.contact_bi_data(id) ON DELETE CASCADE,
  
  field_path TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  
  change_reason TEXT,
  changed_by UUID REFERENCES public.directors(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BI Interview Sessions (sesje rozmów)
CREATE TABLE public.bi_interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_bi_id UUID REFERENCES public.contact_bi_data(id) ON DELETE CASCADE,
  
  -- Typ sesji: 'initial', 'update', 'review'
  session_type TEXT DEFAULT 'initial',
  -- Status: 'in_progress', 'paused', 'completed'
  status TEXT DEFAULT 'in_progress',
  
  questions_asked INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  sections_completed TEXT[] DEFAULT '{}',
  
  -- Log konwersacji (append-only)
  conversation_log JSONB DEFAULT '[]'::jsonb,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_contact_bi_data_contact ON public.contact_bi_data(contact_id);
CREATE INDEX idx_contact_bi_data_tenant ON public.contact_bi_data(tenant_id);
CREATE INDEX idx_contact_bi_data_status ON public.contact_bi_data(bi_status);
CREATE INDEX idx_contact_bi_history_bi_id ON public.contact_bi_history(contact_bi_id);
CREATE INDEX idx_bi_interview_sessions_bi_id ON public.bi_interview_sessions(contact_bi_id);
CREATE INDEX idx_bi_interview_sessions_status ON public.bi_interview_sessions(status);

-- Enable RLS
ALTER TABLE public.contact_bi_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_bi_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_interview_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_bi_data
CREATE POLICY "tenant_access" ON public.contact_bi_data
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- RLS Policies for contact_bi_history
CREATE POLICY "tenant_access" ON public.contact_bi_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.contact_bi_data cbd
      WHERE cbd.id = contact_bi_history.contact_bi_id
      AND cbd.tenant_id = get_current_tenant_id()
    )
  );

-- RLS Policies for bi_interview_sessions
CREATE POLICY "tenant_access" ON public.bi_interview_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.contact_bi_data cbd
      WHERE cbd.id = bi_interview_sessions.contact_bi_id
      AND cbd.tenant_id = get_current_tenant_id()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_contact_bi_data_updated_at
  BEFORE UPDATE ON public.contact_bi_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();