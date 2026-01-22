-- Add company_verified_at column to contacts for tracking verification status
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_verified_at TIMESTAMPTZ DEFAULT NULL;

-- Create sync_jobs table for background job tracking
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  job_type TEXT NOT NULL, -- 'krs_sync', 'create_companies_from_emails'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'paused', 'completed', 'error'
  progress JSONB DEFAULT '{}', -- {processed: 0, total: 0, errors: 0, last_id: null}
  logs JSONB DEFAULT '[]', -- Array of log entries
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on sync_jobs
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync_jobs - only directors can manage their tenant's jobs
CREATE POLICY "Directors can view their tenant sync jobs"
ON sync_jobs FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM directors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Directors can create sync jobs for their tenant"
ON sync_jobs FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM directors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Directors can update their tenant sync jobs"
ON sync_jobs FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM directors WHERE user_id = auth.uid()
  )
);

-- Create index for faster job lookups
CREATE INDEX IF NOT EXISTS idx_sync_jobs_tenant_status ON sync_jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_job_type ON sync_jobs(job_type);

-- Add updated_at trigger for sync_jobs
CREATE TRIGGER update_sync_jobs_updated_at
  BEFORE UPDATE ON sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();