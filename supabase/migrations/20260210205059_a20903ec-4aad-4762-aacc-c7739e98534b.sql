
-- Drop old broken policies
DROP POLICY IF EXISTS "Tenant members can view meeting prospects" ON meeting_prospects;
DROP POLICY IF EXISTS "Tenant members can insert meeting prospects" ON meeting_prospects;
DROP POLICY IF EXISTS "Tenant members can update meeting prospects" ON meeting_prospects;
DROP POLICY IF EXISTS "Tenant members can delete meeting prospects" ON meeting_prospects;

-- Create corrected policies using get_current_tenant_id()
CREATE POLICY "mp_select" ON meeting_prospects FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "mp_insert" ON meeting_prospects FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "mp_update" ON meeting_prospects FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "mp_delete" ON meeting_prospects FOR DELETE
  USING (tenant_id = get_current_tenant_id());
