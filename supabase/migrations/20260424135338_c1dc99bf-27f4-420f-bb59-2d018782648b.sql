-- =========================================================
-- ODPRAWA-01 Kościec — commit 1 (v2: poprawione sygnatury helperów)
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.get_odprawa_agenda(uuid);
--   DROP TABLE IF EXISTS public.odprawa_sessions;
-- =========================================================

-- 1. Tabela
CREATE TABLE IF NOT EXISTS public.odprawa_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  team_id      uuid NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  started_by   uuid NOT NULL,
  status       text NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','closed','abandoned')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  ended_at     timestamptz,
  summary      text,
  covered_contact_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS odprawa_sessions_one_open_per_team
  ON public.odprawa_sessions (team_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS odprawa_sessions_team_started_idx
  ON public.odprawa_sessions (team_id, started_at DESC);

CREATE INDEX IF NOT EXISTS odprawa_sessions_tenant_idx
  ON public.odprawa_sessions (tenant_id);

DROP TRIGGER IF EXISTS odprawa_sessions_set_updated_at ON public.odprawa_sessions;
CREATE TRIGGER odprawa_sessions_set_updated_at
  BEFORE UPDATE ON public.odprawa_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RLS
ALTER TABLE public.odprawa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "odprawa_sessions_select" ON public.odprawa_sessions;
CREATE POLICY "odprawa_sessions_select"
  ON public.odprawa_sessions
  FOR SELECT
  USING (
    public.is_deal_team_member(auth.uid(), team_id)
    OR public.is_tenant_admin(auth.uid(), tenant_id)
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "odprawa_sessions_insert" ON public.odprawa_sessions;
CREATE POLICY "odprawa_sessions_insert"
  ON public.odprawa_sessions
  FOR INSERT
  WITH CHECK (
    started_by = auth.uid()
    AND tenant_id = public.get_current_tenant_id()
    AND (
      public.is_deal_team_member(auth.uid(), team_id)
      OR public.is_tenant_admin(auth.uid(), tenant_id)
      OR public.is_superadmin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "odprawa_sessions_update" ON public.odprawa_sessions;
CREATE POLICY "odprawa_sessions_update"
  ON public.odprawa_sessions
  FOR UPDATE
  USING (
    public.is_deal_team_member(auth.uid(), team_id)
    OR public.is_tenant_admin(auth.uid(), tenant_id)
    OR public.is_superadmin(auth.uid())
  )
  WITH CHECK (
    public.is_deal_team_member(auth.uid(), team_id)
    OR public.is_tenant_admin(auth.uid(), tenant_id)
    OR public.is_superadmin(auth.uid())
  );

DROP POLICY IF EXISTS "odprawa_sessions_delete" ON public.odprawa_sessions;
CREATE POLICY "odprawa_sessions_delete"
  ON public.odprawa_sessions
  FOR DELETE
  USING (
    public.is_tenant_admin(auth.uid(), tenant_id)
    OR public.is_superadmin(auth.uid())
  );

-- 3. RPC: get_odprawa_agenda(team_id)
CREATE OR REPLACE FUNCTION public.get_odprawa_agenda(p_team_id uuid)
RETURNS TABLE (
  deal_team_contact_id uuid,
  contact_id uuid,
  contact_name text,
  company_name text,
  offering_stage text,
  temperature text,
  category text,
  status text,
  next_action_date timestamptz,
  last_status_update timestamptz,
  assigned_to uuid,
  open_questions_count integer,
  has_active_task boolean,
  is_stalled boolean,
  priority_bucket integer,
  last_decision_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT dt.tenant_id INTO v_tenant_id FROM public.deal_teams dt WHERE dt.id = p_team_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'team % not found', p_team_id USING ERRCODE = '42704';
  END IF;

  IF NOT (
    public.is_deal_team_member(auth.uid(), p_team_id)
    OR public.is_tenant_admin(auth.uid(), v_tenant_id)
    OR public.is_superadmin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden: not a member of team %', p_team_id USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      dtc.id                              AS deal_team_contact_id,
      dtc.contact_id                      AS contact_id,
      COALESCE(c.full_name, c.first_name || ' ' || c.last_name) AS contact_name,
      co.name                             AS company_name,
      dtc.offering_stage                  AS offering_stage,
      dtc.temperature                     AS temperature,
      dtc.category                        AS category,
      dtc.status                          AS status,
      dtc.next_action_date                AS next_action_date,
      dtc.last_status_update              AS last_status_update,
      dtc.assigned_to                     AS assigned_to
    FROM public.deal_team_contacts dtc
    LEFT JOIN public.contacts c   ON c.id = dtc.contact_id
    LEFT JOIN public.companies co ON co.id = c.company_id
    WHERE dtc.team_id = p_team_id
      AND COALESCE(dtc.is_lost, false) = false
      AND COALESCE(dtc.status, 'active') NOT IN ('won','lost','archived')
  ),
  questions AS (
    SELECT mq.deal_team_contact_id, COUNT(*)::int AS open_q
    FROM public.meeting_questions mq
    WHERE mq.status = 'open'
    GROUP BY mq.deal_team_contact_id
  ),
  active_tasks AS (
    SELECT DISTINCT t.deal_team_contact_id
    FROM public.tasks t
    WHERE t.deal_team_contact_id IS NOT NULL
      AND COALESCE(t.status, 'open') NOT IN ('done','completed','cancelled','archived')
  ),
  decisions AS (
    SELECT md.deal_team_contact_id, MAX(md.created_at) AS last_decision_at
    FROM public.meeting_decisions md
    GROUP BY md.deal_team_contact_id
  )
  SELECT
    b.deal_team_contact_id,
    b.contact_id,
    b.contact_name,
    b.company_name,
    b.offering_stage,
    b.temperature,
    b.category,
    b.status,
    b.next_action_date,
    b.last_status_update,
    b.assigned_to,
    COALESCE(q.open_q, 0)               AS open_questions_count,
    (at.deal_team_contact_id IS NOT NULL) AS has_active_task,
    (
      at.deal_team_contact_id IS NULL
      AND (b.next_action_date IS NULL OR b.next_action_date < now())
    )                                   AS is_stalled,
    CASE
      WHEN b.temperature = '10x'                                     THEN 1
      WHEN COALESCE(q.open_q, 0) > 0                                 THEN 2
      WHEN at.deal_team_contact_id IS NULL
           AND (b.next_action_date IS NULL OR b.next_action_date < now())
                                                                     THEN 3
      WHEN b.temperature = 'hot'                                     THEN 4
      WHEN b.category    = 'top'                                     THEN 5
      ELSE 6
    END                                  AS priority_bucket,
    d.last_decision_at
  FROM base b
  LEFT JOIN questions     q  ON q.deal_team_contact_id  = b.deal_team_contact_id
  LEFT JOIN active_tasks  at ON at.deal_team_contact_id = b.deal_team_contact_id
  LEFT JOIN decisions     d  ON d.deal_team_contact_id  = b.deal_team_contact_id
  ORDER BY
    CASE
      WHEN b.temperature = '10x'                                     THEN 1
      WHEN COALESCE(q.open_q, 0) > 0                                 THEN 2
      WHEN at.deal_team_contact_id IS NULL
           AND (b.next_action_date IS NULL OR b.next_action_date < now())
                                                                     THEN 3
      WHEN b.temperature = 'hot'                                     THEN 4
      WHEN b.category    = 'top'                                     THEN 5
      ELSE 6
    END ASC,
    b.last_status_update DESC NULLS LAST,
    b.contact_name ASC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_odprawa_agenda(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_odprawa_agenda(uuid) TO authenticated;
