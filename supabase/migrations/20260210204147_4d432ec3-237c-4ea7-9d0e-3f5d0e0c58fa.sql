
-- Create meeting_prospects table for prospecting workflow
CREATE TABLE public.meeting_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  -- Person data (minimal)
  full_name TEXT NOT NULL,
  company TEXT,
  position TEXT,
  industry TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  -- Import source
  source_event TEXT,
  source_file_name TEXT,
  imported_at TIMESTAMPTZ DEFAULT now(),
  imported_by UUID NOT NULL,
  -- Prospecting
  is_prospecting BOOLEAN DEFAULT false,
  prospecting_notes TEXT,
  prospecting_status TEXT DEFAULT 'new',
  -- Conversion
  converted_to_contact_id UUID REFERENCES public.contacts(id),
  converted_to_team_contact_id UUID,
  converted_at TIMESTAMPTZ,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_prospecting_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prospecting_status NOT IN ('new', 'contacted', 'interested', 'not_interested', 'converted') THEN
    RAISE EXCEPTION 'Invalid prospecting_status: %', NEW.prospecting_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_meeting_prospects_status
  BEFORE INSERT OR UPDATE ON public.meeting_prospects
  FOR EACH ROW EXECUTE FUNCTION public.validate_prospecting_status();

-- Updated_at trigger
CREATE TRIGGER update_meeting_prospects_updated_at
  BEFORE UPDATE ON public.meeting_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_meeting_prospects_team_id ON public.meeting_prospects(team_id);
CREATE INDEX idx_meeting_prospects_tenant_id ON public.meeting_prospects(tenant_id);
CREATE INDEX idx_meeting_prospects_is_prospecting ON public.meeting_prospects(is_prospecting) WHERE is_prospecting = true;

-- RLS
ALTER TABLE public.meeting_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view meeting prospects"
  ON public.meeting_prospects FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.directors WHERE id = auth.uid()));

CREATE POLICY "Tenant members can insert meeting prospects"
  ON public.meeting_prospects FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.directors WHERE id = auth.uid()));

CREATE POLICY "Tenant members can update meeting prospects"
  ON public.meeting_prospects FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.directors WHERE id = auth.uid()));

CREATE POLICY "Tenant members can delete meeting prospects"
  ON public.meeting_prospects FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM public.directors WHERE id = auth.uid()));
