
ALTER TABLE deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_team_id_fkey 
    FOREIGN KEY (team_id) REFERENCES deal_teams(id) ON DELETE CASCADE;

ALTER TABLE deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
