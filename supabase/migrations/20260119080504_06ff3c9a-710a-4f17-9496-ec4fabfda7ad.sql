-- Dodanie pól dla grup spółek do tabeli companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS group_companies JSONB DEFAULT NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES companies(id);

COMMENT ON COLUMN companies.group_companies IS 'Lista spółek w grupie z przychodami: [{name, nip, revenue_amount, revenue_year, role, ownership_percent}]';
COMMENT ON COLUMN companies.is_group IS 'Czy firma jest grupą kapitałową';
COMMENT ON COLUMN companies.parent_company_id IS 'ID spółki nadrzędnej jeśli jest częścią grupy';