-- B-FIX.6 — team meetings + task snapshot + streak
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.get_team_meeting_streak(uuid);
--   DROP FUNCTION IF EXISTS public.create_team_meeting(uuid, text, jsonb);
--   DROP TABLE IF EXISTS public.team_meeting_task_snapshot;
--   DROP TABLE IF EXISTS public.team_meetings;

CREATE TABLE IF NOT EXISTS public.team_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  meeting_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES public.directors(id) ON DELETE SET NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_meetings_team_at ON public.team_meetings (team_id, meeting_at DESC);

ALTER TABLE public.team_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tm_select ON public.team_meetings;
CREATE POLICY tm_select ON public.team_meetings
  FOR SELECT USING (public.is_deal_team_member(team_id));

CREATE TABLE IF NOT EXISTS public.team_meeting_task_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.team_meetings(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  team_contact_id uuid NOT NULL REFERENCES public.deal_team_contacts(id) ON DELETE CASCADE,
  column_key text NOT NULL,
  task_status_at_snapshot text NOT NULL,
  UNIQUE (meeting_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_tmts_meeting ON public.team_meeting_task_snapshot (meeting_id);
CREATE INDEX IF NOT EXISTS idx_tmts_task ON public.team_meeting_task_snapshot (task_id);
CREATE INDEX IF NOT EXISTS idx_tmts_team_contact ON public.team_meeting_task_snapshot (team_contact_id);

ALTER TABLE public.team_meeting_task_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tmts_select ON public.team_meeting_task_snapshot;
CREATE POLICY tmts_select ON public.team_meeting_task_snapshot
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_meetings tm
    WHERE tm.id = meeting_id AND public.is_deal_team_member(tm.team_id)
  ));

CREATE OR REPLACE FUNCTION public.create_team_meeting(
  p_team_id uuid,
  p_notes text DEFAULT NULL,
  p_snapshot jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting_id uuid;
  v_tenant_id uuid;
  v_director_id uuid;
BEGIN
  IF NOT public.is_deal_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Access denied to team %', p_team_id;
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM public.deal_teams WHERE id = p_team_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Team % not found', p_team_id;
  END IF;

  BEGIN
    v_director_id := public.get_current_director_id();
  EXCEPTION WHEN OTHERS THEN
    v_director_id := NULL;
  END;

  INSERT INTO public.team_meetings (team_id, tenant_id, created_by, notes)
  VALUES (p_team_id, v_tenant_id, v_director_id, p_notes)
  RETURNING id INTO v_meeting_id;

  INSERT INTO public.team_meeting_task_snapshot
    (meeting_id, task_id, team_contact_id, column_key, task_status_at_snapshot)
  SELECT
    v_meeting_id,
    (s->>'task_id')::uuid,
    (s->>'team_contact_id')::uuid,
    s->>'column_key',
    s->>'task_status_at_snapshot'
  FROM jsonb_array_elements(COALESCE(p_snapshot, '[]'::jsonb)) AS s
  ON CONFLICT (meeting_id, task_id) DO NOTHING;

  RETURN v_meeting_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_meeting_streak(p_team_id uuid)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak int := 0;
  v_prev_meeting_at timestamptz;
  v_cur record;
BEGIN
  IF NOT public.is_deal_team_member(p_team_id) THEN
    RETURN 0;
  END IF;

  FOR v_cur IN
    SELECT id, meeting_at
    FROM public.team_meetings
    WHERE team_id = p_team_id
    ORDER BY meeting_at DESC
  LOOP
    IF v_prev_meeting_at IS NULL THEN
      v_prev_meeting_at := v_cur.meeting_at;
      CONTINUE;
    END IF;

    IF v_prev_meeting_at - v_cur.meeting_at > interval '14 days' THEN
      EXIT;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.team_meeting_task_snapshot s
      JOIN public.tasks t ON t.id = s.task_id
      WHERE s.meeting_id = v_cur.id
        AND (t.status != 'completed' OR t.updated_at > v_prev_meeting_at)
    ) THEN
      EXIT;
    END IF;

    v_streak := v_streak + 1;
    v_prev_meeting_at := v_cur.meeting_at;
  END LOOP;

  RETURN v_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_team_meeting(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_meeting_streak(uuid) TO authenticated;