
-- Rozszerz politykę SELECT: czlonek zespolu LUB admin tenanta LUB wlasciciel kontaktu
DROP POLICY IF EXISTS "dtc_select" ON deal_team_contacts;
CREATE POLICY "dtc_select" ON deal_team_contacts
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_deal_team_member(team_id)
      OR is_tenant_admin(auth.uid(), tenant_id)
      OR contact_id IN (SELECT id FROM contacts WHERE director_id = get_current_director_id())
    )
  );

-- Rozszerz politykę INSERT: czlonek zespolu LUB admin tenanta
DROP POLICY IF EXISTS "dtc_insert" ON deal_team_contacts;
CREATE POLICY "dtc_insert" ON deal_team_contacts
  FOR INSERT WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND (
      is_deal_team_member(team_id)
      OR is_tenant_admin(auth.uid(), tenant_id)
    )
  );

-- Rozszerz politykę DELETE: czlonek zespolu LUB admin tenanta
DROP POLICY IF EXISTS "dtc_delete" ON deal_team_contacts;
CREATE POLICY "dtc_delete" ON deal_team_contacts
  FOR DELETE USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_deal_team_member(team_id)
      OR is_tenant_admin(auth.uid(), tenant_id)
    )
  );
