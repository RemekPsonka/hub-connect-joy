-- Dodanie brakujących kolumn do deal_teams
ALTER TABLE deal_teams 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'users',
ADD COLUMN IF NOT EXISTS weekly_status_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Dodanie brakujących kolumn do deal_team_members
ALTER TABLE deal_team_members 
ADD COLUMN IF NOT EXISTS tenant_id UUID,
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();

-- Aktualizacja tenant_id w deal_team_members na podstawie deal_teams
UPDATE deal_team_members dtm
SET tenant_id = dt.tenant_id
FROM deal_teams dt
WHERE dtm.team_id = dt.id
AND dtm.tenant_id IS NULL;

-- Ustawienie NOT NULL na tenant_id po wypełnieniu
ALTER TABLE deal_team_members ALTER COLUMN tenant_id SET NOT NULL;

-- Dodanie UNIQUE constraint (ignoruj jeśli istnieje)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_team_members_team_id_director_id_key'
  ) THEN
    ALTER TABLE deal_team_members ADD CONSTRAINT deal_team_members_team_id_director_id_key UNIQUE(team_id, director_id);
  END IF;
END $$;

-- Aktualizacja funkcji is_deal_team_member na wersję zgodną z promptem
CREATE OR REPLACE FUNCTION is_deal_team_member(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM deal_team_members
    WHERE team_id = p_team_id
    AND director_id = get_current_director_id()
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Indeksy (z IF NOT EXISTS dla bezpieczeństwa)
CREATE INDEX IF NOT EXISTS idx_dt_tenant ON deal_teams(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dtm_director ON deal_team_members(director_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dtm_team ON deal_team_members(team_id, is_active);

-- Sprawdzenie i dodanie brakujących polityk RLS dla deal_teams
DROP POLICY IF EXISTS deal_teams_select ON deal_teams;
CREATE POLICY deal_teams_select ON deal_teams FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS deal_teams_insert ON deal_teams;
CREATE POLICY deal_teams_insert ON deal_teams FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS deal_teams_update ON deal_teams;
CREATE POLICY deal_teams_update ON deal_teams FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_deal_team_member(id));

DROP POLICY IF EXISTS deal_teams_delete ON deal_teams;
CREATE POLICY deal_teams_delete ON deal_teams FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND created_by = get_current_director_id());

-- Polityki RLS dla deal_team_members
DROP POLICY IF EXISTS dtm_select ON deal_team_members;
CREATE POLICY dtm_select ON deal_team_members FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS dtm_insert ON deal_team_members;
CREATE POLICY dtm_insert ON deal_team_members FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS dtm_update ON deal_team_members;
CREATE POLICY dtm_update ON deal_team_members FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS dtm_delete ON deal_team_members;
CREATE POLICY dtm_delete ON deal_team_members FOR DELETE
  USING (tenant_id = get_current_tenant_id());