-- Sprint 18.5 — Task RLS UPDATE consolidation
-- Existing UPDATE policies on public.tasks:
--   "Users can update own or team tasks": (tenant_id = get_current_tenant_id()) AND (owner_id = get_current_director_id() OR assigned_to = get_current_director_id() OR (deal_team_id IS NOT NULL AND is_deal_team_member(auth.uid(), deal_team_id)))
--   "tasks_director_update": (auth.uid() IS NOT NULL) AND (tenant_id = get_current_tenant_id()) AND (is_tenant_admin(auth.uid(), tenant_id) OR owner_id = get_current_director_id() OR assigned_to = get_current_director_id())
-- Both used assigned_to = get_current_director_id() but `assigned_to` stores auth user id in some flows → mismatch caused 0 rows affected.

DROP POLICY IF EXISTS "Users can update own or team tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_director_update" ON public.tasks;

CREATE POLICY tasks_update_tenant ON public.tasks
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      assigned_to = auth.uid()
      OR assigned_to = public.get_current_director_id()
      OR owner_id = public.get_current_director_id()
      OR public.is_superadmin()
      OR public.is_tenant_admin(auth.uid(), tenant_id)
      OR (deal_team_id IS NOT NULL AND public.is_deal_team_member(auth.uid(), deal_team_id))
    )
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

-- ROLLBACK:
-- DROP POLICY IF EXISTS tasks_update_tenant ON public.tasks;
-- CREATE POLICY "Users can update own or team tasks" ON public.tasks FOR UPDATE
--   USING ((tenant_id = get_current_tenant_id()) AND ((owner_id = get_current_director_id()) OR (assigned_to = get_current_director_id()) OR ((deal_team_id IS NOT NULL) AND is_deal_team_member(auth.uid(), deal_team_id))));
-- CREATE POLICY tasks_director_update ON public.tasks FOR UPDATE
--   USING ((auth.uid() IS NOT NULL) AND (tenant_id = get_current_tenant_id()) AND (is_tenant_admin(auth.uid(), tenant_id) OR (owner_id = get_current_director_id()) OR (assigned_to = get_current_director_id())));