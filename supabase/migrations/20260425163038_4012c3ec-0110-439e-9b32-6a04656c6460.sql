DROP POLICY IF EXISTS "dtal_insert_team_member" ON public.deal_team_activity_log;

CREATE POLICY "dtal_insert_team_member"
ON public.deal_team_activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_deal_team_member(team_id)
  AND (
    actor_id IS NULL
    OR actor_id = public.get_current_director_id()
  )
);