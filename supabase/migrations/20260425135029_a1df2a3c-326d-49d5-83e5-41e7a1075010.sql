-- ODPRAWA-03 Faza B: AI agenda proposals + audit log + get_odprawa_agenda extension
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.get_odprawa_agenda(uuid, text);
--   -- Then restore previous get_odprawa_agenda from migration history
--   DROP TABLE IF EXISTS public.ai_audit_log;
--   DROP TABLE IF EXISTS public.ai_agenda_proposals;

BEGIN;

-- 1. ai_agenda_proposals
CREATE TABLE IF NOT EXISTS public.ai_agenda_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text NOT NULL DEFAULT 'cron' CHECK (generated_by IN ('cron','manual')),
  triggered_by uuid REFERENCES public.directors(id) ON DELETE SET NULL,
  ranked_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  llm_provider text,
  llm_model text,
  llm_tokens_in integer DEFAULT 0,
  llm_tokens_out integer DEFAULT 0,
  llm_cost_cents numeric(10,4) DEFAULT 0,
  used_in_session_id uuid REFERENCES public.odprawa_sessions(id) ON DELETE SET NULL,
  error text
);

CREATE INDEX IF NOT EXISTS idx_ai_agenda_team_generated
  ON public.ai_agenda_proposals(team_id, generated_at DESC);

ALTER TABLE public.ai_agenda_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_agenda_team_select" ON public.ai_agenda_proposals;
CREATE POLICY "ai_agenda_team_select" ON public.ai_agenda_proposals
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND public.is_deal_team_member(team_id)
  );

DROP POLICY IF EXISTS "ai_agenda_service_insert" ON public.ai_agenda_proposals;
CREATE POLICY "ai_agenda_service_insert" ON public.ai_agenda_proposals
  FOR INSERT WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

DROP POLICY IF EXISTS "ai_agenda_service_update" ON public.ai_agenda_proposals;
CREATE POLICY "ai_agenda_service_update" ON public.ai_agenda_proposals
  FOR UPDATE USING (
    tenant_id = public.get_current_tenant_id()
    AND public.is_deal_team_member(team_id)
  );

-- 2. ai_audit_log (per master-spec 8.4)
CREATE TABLE IF NOT EXISTS public.ai_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  team_id uuid REFERENCES public.deal_teams(id) ON DELETE SET NULL,
  odprawa_session_id uuid REFERENCES public.odprawa_sessions(id) ON DELETE SET NULL,
  user_id uuid,
  timestamp timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type IN (
    'tool_call_read','tool_call_write','llm_response','llm_error',
    'user_confirm','user_reject'
  )),
  tool_name text,
  input jsonb,
  output jsonb,
  confirmed boolean,
  error text,
  llm_model text,
  llm_tokens_in integer,
  llm_tokens_out integer,
  llm_cost_cents numeric(10,4)
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_session
  ON public.ai_audit_log(odprawa_session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_team
  ON public.ai_audit_log(team_id, timestamp DESC);

ALTER TABLE public.ai_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_audit_team_select" ON public.ai_audit_log;
CREATE POLICY "ai_audit_team_select" ON public.ai_audit_log
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
    AND (team_id IS NULL OR public.is_deal_team_member(team_id))
  );

DROP POLICY IF EXISTS "ai_audit_authenticated_insert" ON public.ai_audit_log;
CREATE POLICY "ai_audit_authenticated_insert" ON public.ai_audit_log
  FOR INSERT WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

-- 3. Modyfikacja get_odprawa_agenda — dodaje ai_reason + sortowanie wg świeżego proposal.
-- DROP wymagany bo zmieniamy sygnaturę RETURNS TABLE.
DROP FUNCTION IF EXISTS public.get_odprawa_agenda(uuid, text);

CREATE FUNCTION public.get_odprawa_agenda(p_team_id uuid, p_mode text DEFAULT 'standard'::text)
RETURNS TABLE(
  contact_id uuid,
  contact_name text,
  company_name text,
  stage text,
  temperature text,
  is_lost boolean,
  next_action_date timestamptz,
  last_status_update timestamptz,
  priority_bucket text,
  priority_rank integer,
  active_task_count bigint,
  ai_reason text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal_id uuid;
BEGIN
  IF NOT public.is_deal_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Access denied: not a member of team %', p_team_id;
  END IF;

  -- Find freshest AI agenda proposal (<48h)
  SELECT id INTO v_proposal_id
  FROM public.ai_agenda_proposals
  WHERE team_id = p_team_id
    AND generated_at > now() - INTERVAL '48 hours'
  ORDER BY generated_at DESC
  LIMIT 1;

  RETURN QUERY
  WITH dtc AS (
    SELECT
      d.id AS dtc_id,
      d.contact_id,
      d.team_id,
      d.category AS stage,
      d.temperature,
      d.is_lost,
      d.next_action_date::timestamptz AS next_action_date,
      d.last_status_update
    FROM public.deal_team_contacts d
    WHERE d.team_id = p_team_id
      AND COALESCE(d.is_lost, false) = false
  ),
  task_counts AS (
    SELECT
      t.deal_team_contact_id AS dtc_id,
      COUNT(*) FILTER (WHERE t.status NOT IN ('completed', 'cancelled')) AS active_count,
      MIN(t.due_date) FILTER (WHERE t.status NOT IN ('completed', 'cancelled')) AS earliest_due
    FROM public.tasks t
    WHERE t.deal_team_contact_id IN (SELECT dtc_id FROM dtc)
    GROUP BY t.deal_team_contact_id
  ),
  ai_ranking AS (
    SELECT
      (item->>'contact_id')::uuid AS contact_id,
      (ord - 1)::int AS ai_rank,
      item->>'reason' AS ai_reason
    FROM public.ai_agenda_proposals p
    CROSS JOIN LATERAL jsonb_array_elements(p.ranked_contacts) WITH ORDINALITY AS arr(item, ord)
    WHERE p.id = v_proposal_id
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
        WHEN dtc.temperature = '10x' OR dtc.stage = '10x' THEN '10x'
        WHEN dtc.stage = 'offering'
             AND COALESCE(tc.active_count, 0) = 0
             AND (dtc.next_action_date IS NULL OR dtc.next_action_date < now())
          THEN 'stalled'
        WHEN tc.earliest_due IS NOT NULL AND tc.earliest_due <= now() + INTERVAL '3 days'
          THEN 'due_soon'
        ELSE 'other'
      END AS priority_bucket,
      ar.ai_rank,
      ar.ai_reason
    FROM dtc
    LEFT JOIN public.contacts c ON c.id = dtc.contact_id
    LEFT JOIN public.companies co ON co.id = c.company_id
    LEFT JOIN task_counts tc ON tc.dtc_id = dtc.dtc_id
    LEFT JOIN ai_ranking ar ON ar.contact_id = dtc.contact_id
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
    e.active_task_count,
    e.ai_reason
  FROM enriched e
  ORDER BY
    CASE WHEN v_proposal_id IS NOT NULL AND e.ai_rank IS NOT NULL THEN 0 ELSE 1 END ASC,
    e.ai_rank ASC NULLS LAST,
    CASE e.priority_bucket
      WHEN '10x' THEN 0
      WHEN 'stalled' THEN 1
      WHEN 'due_soon' THEN 2
      ELSE 3
    END ASC,
    e.last_status_update DESC NULLS LAST;
END;
$function$;

COMMIT;