-- ============================================================
-- ODPRAWA-01 Kościec — Commit #1
-- Tabela odprawa_sessions + RPC get_odprawa_agenda
-- ============================================================

-- 1. ENUM dla statusu sesji
DO $$ BEGIN
  CREATE TYPE public.odprawa_session_status AS ENUM ('active', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabela odprawa_sessions
CREATE TABLE IF NOT EXISTS public.odprawa_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  started_by UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status public.odprawa_session_status NOT NULL DEFAULT 'active',
  mode TEXT NOT NULL DEFAULT 'standard',
  agenda_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indeksy
CREATE INDEX IF NOT EXISTS idx_odprawa_sessions_team_id ON public.odprawa_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_odprawa_sessions_status ON public.odprawa_sessions(status);
CREATE INDEX IF NOT EXISTS idx_odprawa_sessions_team_status ON public.odprawa_sessions(team_id, status);
CREATE INDEX IF NOT EXISTS idx_odprawa_sessions_started_at ON public.odprawa_sessions(started_at DESC);

-- 4. RLS
ALTER TABLE public.odprawa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view odprawa sessions" ON public.odprawa_sessions;
CREATE POLICY "Team members can view odprawa sessions"
  ON public.odprawa_sessions FOR SELECT TO authenticated
  USING (public.is_deal_team_member(team_id));

DROP POLICY IF EXISTS "Team members can create odprawa sessions" ON public.odprawa_sessions;
CREATE POLICY "Team members can create odprawa sessions"
  ON public.odprawa_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_deal_team_member(team_id) AND started_by = auth.uid());

DROP POLICY IF EXISTS "Team members can update odprawa sessions" ON public.odprawa_sessions;
CREATE POLICY "Team members can update odprawa sessions"
  ON public.odprawa_sessions FOR UPDATE TO authenticated
  USING (public.is_deal_team_member(team_id))
  WITH CHECK (public.is_deal_team_member(team_id));

-- 5. Trigger updated_at
CREATE TRIGGER trg_odprawa_sessions_updated_at
  BEFORE UPDATE ON public.odprawa_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RPC get_odprawa_agenda
CREATE OR REPLACE FUNCTION public.get_odprawa_agenda(
  p_team_id UUID,
  p_mode TEXT DEFAULT 'standard'
)
RETURNS TABLE (
  contact_id UUID,
  contact_name TEXT,
  company_name TEXT,
  stage TEXT,
  temperature TEXT,
  is_lost BOOLEAN,
  next_action_date TIMESTAMPTZ,
  last_status_update TIMESTAMPTZ,
  priority_bucket TEXT,
  priority_rank INTEGER,
  active_task_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_deal_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Access denied: not a member of team %', p_team_id;
  END IF;

  RETURN QUERY
  WITH dtc AS (
    SELECT
      d.contact_id,
      d.team_id,
      d.stage,
      d.temperature,
      d.is_lost,
      d.next_action_date,
      d.last_status_update
    FROM public.deal_team_contacts d
    WHERE d.team_id = p_team_id
      AND COALESCE(d.is_lost, false) = false
  ),
  task_counts AS (
    SELECT
      t.contact_id,
      COUNT(*) FILTER (WHERE t.status NOT IN ('completed', 'cancelled')) AS active_count,
      MIN(t.due_date) FILTER (WHERE t.status NOT IN ('completed', 'cancelled')) AS earliest_due
    FROM public.tasks t
    WHERE t.contact_id IN (SELECT contact_id FROM dtc)
    GROUP BY t.contact_id
  ),
  enriched AS (
    SELECT
      dtc.contact_id,
      COALESCE(c.first_name || ' ' || c.last_name, c.last_name, 'Bez nazwy') AS contact_name,
      COALESCE(co.name, c.company) AS company_name,
      dtc.stage,
      dtc.temperature,
      dtc.is_lost,
      dtc.next_action_date,
      dtc.last_status_update,
      COALESCE(tc.active_count, 0) AS active_task_count,
      tc.earliest_due,
      CASE
        WHEN dtc.temperature = '10x' THEN '10x'
        WHEN dtc.stage = 'ofertowanie'
             AND COALESCE(tc.active_count, 0) = 0
             AND (dtc.next_action_date IS NULL OR dtc.next_action_date < now())
          THEN 'stalled'
        WHEN tc.earliest_due IS NOT NULL AND tc.earliest_due <= now() + INTERVAL '3 days'
          THEN 'due_soon'
        ELSE 'other'
      END AS priority_bucket
    FROM dtc
    LEFT JOIN public.contacts c ON c.id = dtc.contact_id
    LEFT JOIN public.companies co ON co.id = c.company_id
    LEFT JOIN task_counts tc ON tc.contact_id = dtc.contact_id
  )
  SELECT
    e.contact_id,
    e.contact_name,
    e.company_name,
    e.stage,
    e.temperature,
    e.is_lost,
    e.next_action_date,
    e.last_status_update,
    e.priority_bucket,
    CASE e.priority_bucket
      WHEN '10x' THEN 0
      WHEN 'stalled' THEN 1
      WHEN 'due_soon' THEN 2
      ELSE 3
    END AS priority_rank,
    e.active_task_count
  FROM enriched e
  ORDER BY priority_rank ASC, e.last_status_update DESC NULLS LAST;
END;
$$;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.get_odprawa_agenda(uuid, text);
-- DROP TABLE IF EXISTS public.odprawa_sessions CASCADE;
-- DROP TYPE IF EXISTS public.odprawa_session_status;