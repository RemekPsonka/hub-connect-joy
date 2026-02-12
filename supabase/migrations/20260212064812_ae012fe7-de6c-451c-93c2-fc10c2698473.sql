
-- 1. SECURITY DEFINER helper: check if contact is in user's deal team
CREATE OR REPLACE FUNCTION public.is_contact_in_my_deal_team(_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deal_team_contacts dtc
    INNER JOIN deal_team_members dtm ON dtm.team_id = dtc.team_id
    WHERE dtc.contact_id = _contact_id
    AND dtm.director_id = (SELECT id FROM directors WHERE user_id = auth.uid() LIMIT 1)
    AND dtm.is_active = true
  )
$$;

-- 2. SECURITY DEFINER helper: check if group is shared to current user
CREATE OR REPLACE FUNCTION public.is_group_shared_to_me(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contact_group_shares cgs
    LEFT JOIN deal_team_members dtm ON dtm.team_id = cgs.shared_with_team_id AND dtm.is_active = true
    WHERE cgs.group_id = _group_id
    AND (
      cgs.shared_with_director_id = (SELECT id FROM directors WHERE user_id = auth.uid() LIMIT 1)
      OR dtm.director_id = (SELECT id FROM directors WHERE user_id = auth.uid() LIMIT 1)
    )
  )
$$;

-- 3. Fix deal_team_members policies - remove self-referencing subquery
DROP POLICY IF EXISTS "dtm_select" ON deal_team_members;
CREATE POLICY "dtm_select" ON deal_team_members
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR is_deal_team_member(team_id)
    )
  );

DROP POLICY IF EXISTS "team_members_select" ON deal_team_members;
-- No longer needed, dtm_select covers it

-- 4. Fix deal_teams_select - use SECURITY DEFINER function
DROP POLICY IF EXISTS "deal_teams_select" ON deal_teams;
CREATE POLICY "deal_teams_select" ON deal_teams
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR is_deal_team_member(id)
    )
  );

-- 5. Fix dtc_select - remove contacts reference, use SECURITY DEFINER
DROP POLICY IF EXISTS "dtc_select" ON deal_team_contacts;
CREATE POLICY "dtc_select" ON deal_team_contacts
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_deal_team_member(team_id)
      OR is_tenant_admin(auth.uid(), tenant_id)
    )
  );

-- 6. Fix contacts_director_select - use SECURITY DEFINER helpers
DROP POLICY IF EXISTS "contacts_director_select" ON contacts;
CREATE POLICY "contacts_director_select" ON contacts
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR director_id = get_current_director_id()
      OR EXISTS (
        SELECT 1 FROM contact_shares cs
        WHERE cs.contact_id = contacts.id
        AND cs.shared_with_director_id = get_current_director_id()
      )
      OR is_contact_in_my_deal_team(id)
      OR is_group_shared_to_me(primary_group_id)
    )
  );
