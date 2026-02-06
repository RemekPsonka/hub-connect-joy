-- =============================================
-- DEAL TEAMS SYSTEM - Elastyczny system uprawnień
-- =============================================

-- 1. Tabela zespołów
CREATE TABLE public.deal_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.directors(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- 2. Tabela członków zespołów
CREATE TABLE public.deal_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  director_id UUID NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, director_id)
);

-- 3. Dodaj kolumnę team_id do deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.deal_teams(id);

-- 4. Funkcja pomocnicza: czy użytkownik jest członkiem zespołu
CREATE OR REPLACE FUNCTION public.is_deal_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deal_team_members dtm
    INNER JOIN directors d ON d.id = dtm.director_id
    WHERE dtm.team_id = _team_id
      AND d.user_id = _user_id
  )
$$;

-- 5. RLS dla deal_teams
ALTER TABLE public.deal_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_teams_select" ON public.deal_teams 
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "deal_teams_insert" ON public.deal_teams 
  FOR INSERT WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "deal_teams_update" ON public.deal_teams 
  FOR UPDATE USING (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "deal_teams_delete" ON public.deal_teams 
  FOR DELETE USING (is_tenant_admin(auth.uid(), tenant_id));

-- 6. RLS dla deal_team_members
ALTER TABLE public.deal_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_select" ON public.deal_team_members 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deal_teams dt 
      WHERE dt.id = team_id AND dt.tenant_id = get_current_tenant_id()
    )
  );

CREATE POLICY "team_members_insert" ON public.deal_team_members 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deal_teams dt 
      WHERE dt.id = team_id 
        AND is_tenant_admin(auth.uid(), dt.tenant_id)
    )
  );

CREATE POLICY "team_members_update" ON public.deal_team_members 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM deal_teams dt 
      WHERE dt.id = team_id 
        AND is_tenant_admin(auth.uid(), dt.tenant_id)
    )
  );

CREATE POLICY "team_members_delete" ON public.deal_team_members 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM deal_teams dt 
      WHERE dt.id = team_id 
        AND is_tenant_admin(auth.uid(), dt.tenant_id)
    )
  );

-- 7. Zaktualizuj RLS dla deals - uwzględnij team_id
DROP POLICY IF EXISTS "deals_select" ON public.deals;

CREATE POLICY "deals_select" ON public.deals FOR SELECT
USING (
  tenant_id = get_current_tenant_id()
  AND (
    -- Admin widzi wszystko
    is_tenant_admin(auth.uid(), tenant_id)
    OR
    -- Deals bez team_id - widzi owner
    (team_id IS NULL AND owner_id = (
      SELECT id FROM directors WHERE user_id = auth.uid() LIMIT 1
    ))
    OR
    -- Deals z team_id - widzi członek zespołu
    (team_id IS NOT NULL AND is_deal_team_member(auth.uid(), team_id))
  )
);

-- 8. Maskowanie danych kontaktów - tylko admin widzi BI
DROP POLICY IF EXISTS "Users can view their own business interviews" ON public.business_interviews;
DROP POLICY IF EXISTS "business_interviews_select" ON public.business_interviews;

CREATE POLICY "business_interviews_select" ON public.business_interviews 
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin(auth.uid(), tenant_id)
  );

-- 9. Maskowanie danych kontaktów - tylko admin widzi agent memory
DROP POLICY IF EXISTS "Users can view their own agent memory" ON public.contact_agent_memory;
DROP POLICY IF EXISTS "contact_agent_memory_select" ON public.contact_agent_memory;

CREATE POLICY "contact_agent_memory_select" ON public.contact_agent_memory 
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND is_tenant_admin(auth.uid(), tenant_id)
  );