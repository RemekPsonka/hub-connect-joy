-- Create storage bucket for bug screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bug screenshots
CREATE POLICY "Users can upload bug screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'bug-screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view bug screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'bug-screenshots');

-- Create bug_reports table
CREATE TABLE bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Reporter
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name TEXT,
  
  -- Problem description
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Context
  page_url TEXT,
  screenshot_url TEXT,
  context_data JSONB,
  
  -- Status and priority
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'testing', 'resolved', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  
  -- Resolution notes
  resolution_notes TEXT
);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view bug reports in their tenant" 
ON bug_reports FOR SELECT 
USING (tenant_id IN (
  SELECT tenant_id FROM directors WHERE user_id = auth.uid()
  UNION
  SELECT tenant_id FROM assistants WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create bug reports in their tenant" 
ON bug_reports FOR INSERT 
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM directors WHERE user_id = auth.uid()
  UNION
  SELECT tenant_id FROM assistants WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update bug reports in their tenant" 
ON bug_reports FOR UPDATE 
USING (tenant_id IN (
  SELECT tenant_id FROM directors WHERE user_id = auth.uid()
  UNION
  SELECT tenant_id FROM assistants WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete bug reports in their tenant" 
ON bug_reports FOR DELETE 
USING (tenant_id IN (
  SELECT tenant_id FROM directors WHERE user_id = auth.uid()
  UNION
  SELECT tenant_id FROM assistants WHERE user_id = auth.uid()
));

-- Indexes
CREATE INDEX idx_bug_reports_tenant ON bug_reports(tenant_id);
CREATE INDEX idx_bug_reports_status ON bug_reports(status);
CREATE INDEX idx_bug_reports_priority ON bug_reports(priority);
CREATE INDEX idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();