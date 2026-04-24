-- RPC v2: fix get_odprawa_agenda — JOIN tasks via deal_team_contact_id (Variant A)
-- ROLLBACK: przywróć poprzednią wersję funkcji z migracji 20260424185216_20b539cf-cab4-47eb-a9eb-f55bfc519e8a.sql

CREATE OR REPLACE FUNCTION public.get_odprawa_agenda(p_team_id uuid, p_mode text DEFAULT 'standard'::text)
 RETURNS TABLE(contact_id uuid, contact_name text, company_name text, stage text, temperature text, is_lost boolean, next_action_date timestamp with time zone, last_status_update timestamp with time zone, priority_bucket text, priority_rank integer, active_task_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_deal_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Access denied: not a member of team %', p_team_id;
  END IF;

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
      END AS priority_bucket
    FROM dtc
    LEFT JOIN public.contacts c ON c.id = dtc.contact_id
    LEFT JOIN public.companies co ON co.id = c.company_id
    LEFT JOIN task_counts tc ON tc.dtc_id = dtc.dtc_id
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
$function$;