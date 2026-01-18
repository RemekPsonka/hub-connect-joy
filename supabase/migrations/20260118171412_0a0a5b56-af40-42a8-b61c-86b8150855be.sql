-- Add linkedin_data column to contacts table for career/education data
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_data JSONB;

-- Create linkedin_network_contacts table for storing network connections
CREATE TABLE IF NOT EXISTS linkedin_network_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company TEXT,
  position TEXT,
  linkedin_url TEXT,
  matched_contact_id UUID REFERENCES contacts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups by source contact
CREATE INDEX IF NOT EXISTS idx_linkedin_network_source ON linkedin_network_contacts(source_contact_id);

-- Index for tenant isolation
CREATE INDEX IF NOT EXISTS idx_linkedin_network_tenant ON linkedin_network_contacts(tenant_id);

-- Enable RLS
ALTER TABLE linkedin_network_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for linkedin_network_contacts
CREATE POLICY "Directors can view linkedin network contacts"
  ON linkedin_network_contacts FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM directors WHERE user_id = auth.uid()));

CREATE POLICY "Directors can insert linkedin network contacts"
  ON linkedin_network_contacts FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM directors WHERE user_id = auth.uid()));

CREATE POLICY "Directors can update linkedin network contacts"
  ON linkedin_network_contacts FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM directors WHERE user_id = auth.uid()));

CREATE POLICY "Directors can delete linkedin network contacts"
  ON linkedin_network_contacts FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM directors WHERE user_id = auth.uid()));

-- Assistants policies
CREATE POLICY "Assistants can view linkedin network contacts"
  ON linkedin_network_contacts FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM assistants WHERE user_id = auth.uid())
    AND source_contact_id IN (
      SELECT c.id FROM contacts c
      JOIN assistant_group_access aga ON c.primary_group_id = aga.group_id
      JOIN assistants a ON aga.assistant_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Assistants can insert linkedin network contacts"
  ON linkedin_network_contacts FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM assistants WHERE user_id = auth.uid())
    AND source_contact_id IN (
      SELECT c.id FROM contacts c
      JOIN assistant_group_access aga ON c.primary_group_id = aga.group_id
      JOIN assistants a ON aga.assistant_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );