
-- Krok 1: Dodanie kolumn deal_team_id i deal_team_contact_id do tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deal_team_id UUID REFERENCES public.deal_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_team_contact_id UUID REFERENCES public.deal_team_contacts(id) ON DELETE SET NULL;

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_tasks_deal_team_id ON public.tasks(deal_team_id) WHERE deal_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deal_team_contact_id ON public.tasks(deal_team_contact_id) WHERE deal_team_contact_id IS NOT NULL;

-- Krok 2: Migracja danych z deal_team_assignments do tasks
INSERT INTO public.tasks (
  tenant_id, title, description, status, priority, due_date,
  owner_id, assigned_to, deal_team_id, deal_team_contact_id, created_at
)
SELECT
  dta.tenant_id,
  dta.title,
  dta.description,
  CASE dta.status
    WHEN 'pending' THEN 'todo'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'done' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'todo'
  END,
  COALESCE(dta.priority, 'medium'),
  dta.due_date,
  dta.assigned_by,
  dta.assigned_to,
  dta.team_id,
  dta.team_contact_id,
  COALESCE(dta.created_at, now())
FROM public.deal_team_assignments dta;

-- Krok 3: Rozszerzenie RLS na tasks — członkowie zespołu mogą widzieć i edytować zadania zespołowe
-- Najpierw usuń istniejące polityki, które będą zastąpione rozszerzonymi
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

-- Rozszerzone polityki: owner/assigned + deal_team_member
CREATE POLICY "Users can view own or team tasks" ON public.tasks
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      owner_id = public.get_current_director_id()
      OR assigned_to = public.get_current_director_id()
      OR (deal_team_id IS NOT NULL AND public.is_deal_team_member(auth.uid(), deal_team_id))
    )
  );

CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY "Users can update own or team tasks" ON public.tasks
  FOR UPDATE USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      owner_id = public.get_current_director_id()
      OR assigned_to = public.get_current_director_id()
      OR (deal_team_id IS NOT NULL AND public.is_deal_team_member(auth.uid(), deal_team_id))
    )
  );

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (
    tenant_id = public.get_current_tenant_id()
    AND owner_id = public.get_current_director_id()
  );
