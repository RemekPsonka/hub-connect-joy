ALTER TABLE public.ai_agenda_proposals
  ADD COLUMN IF NOT EXISTS grouped_sections jsonb;

COMMENT ON COLUMN public.ai_agenda_proposals.grouped_sections IS
  'Sekcje pre-briefu: [{key,label,icon,contacts:[{contact_id,reason}]}]. NULL = legacy proposal (uzyj ranked_contacts).';

DROP FUNCTION IF EXISTS public.get_odprawa_agenda(uuid, text);

CREATE FUNCTION public.get_odprawa_agenda(p_team_id uuid, p_mode text DEFAULT 'standard'::text)
 RETURNS TABLE(
   contact_id uuid,
   contact_name text,
   company_name text,
   stage text,
   temperature text,
   is_lost boolean,
   next_action_date timestamp with time zone,
   last_status_update timestamp with time zone,
   priority_bucket text,
   priority_rank integer,
   active_task_count bigint,
   ai_reason text,
   ai_section_key text,
   ai_section_label text,
   ai_section_icon text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal_id uuid;
  v_has_sections boolean := false;
BEGIN
  IF NOT public.is_deal_team_member(p_team_id) THEN
    RAISE EXCEPTION 'Access denied: not a member of team %', p_team_id;
  END IF;

  SELECT id, (grouped_sections IS NOT NULL AND jsonb_typeof(grouped_sections) = 'array' AND jsonb_array_length(grouped_sections) > 0)
    INTO v_proposal_id, v_has_sections
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
  ai_sections AS (
    SELECT DISTINCT ON ((c->>'contact_id')::uuid)
      (c->>'contact_id')::uuid AS contact_id,
      c->>'reason' AS ai_reason,
      s->>'key' AS section_key,
      s->>'label' AS section_label,
      s->>'icon' AS section_icon,
      CASE s->>'key'
        WHEN 'urgent' THEN 0
        WHEN '10x' THEN 1
        WHEN 'stalled' THEN 2
        WHEN 'followup' THEN 3
        WHEN 'new_prospects' THEN 4
        ELSE 5
      END AS section_order
    FROM public.ai_agenda_proposals p
    CROSS JOIN LATERAL jsonb_array_elements(p.grouped_sections) AS s
    CROSS JOIN LATERAL jsonb_array_elements(s->'contacts') AS c
    WHERE p.id = v_proposal_id AND v_has_sections
    ORDER BY (c->>'contact_id')::uuid,
             CASE s->>'key'
               WHEN 'urgent' THEN 0
               WHEN '10x' THEN 1
               WHEN 'stalled' THEN 2
               WHEN 'followup' THEN 3
               WHEN 'new_prospects' THEN 4
               ELSE 5
             END
  ),
  ai_ranking AS (
    SELECT
      (item->>'contact_id')::uuid AS contact_id,
      (ord - 1)::int AS ai_rank,
      item->>'reason' AS ai_reason
    FROM public.ai_agenda_proposals p
    CROSS JOIN LATERAL jsonb_array_elements(p.ranked_contacts) WITH ORDINALITY AS arr(item, ord)
    WHERE p.id = v_proposal_id AND NOT v_has_sections
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
      COALESCE(asec.ai_reason, ar.ai_reason) AS ai_reason,
      asec.section_key AS ai_section_key,
      asec.section_label AS ai_section_label,
      asec.section_icon AS ai_section_icon,
      asec.section_order
    FROM dtc
    LEFT JOIN public.contacts c ON c.id = dtc.contact_id
    LEFT JOIN public.companies co ON co.id = c.company_id
    LEFT JOIN task_counts tc ON tc.dtc_id = dtc.dtc_id
    LEFT JOIN ai_ranking ar ON ar.contact_id = dtc.contact_id
    LEFT JOIN ai_sections asec ON asec.contact_id = dtc.contact_id
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
    e.ai_reason,
    e.ai_section_key,
    e.ai_section_label,
    e.ai_section_icon
  FROM enriched e
  ORDER BY
    CASE
      WHEN v_has_sections AND e.ai_section_key IS NOT NULL THEN e.section_order
      WHEN v_has_sections AND e.ai_section_key IS NULL THEN 99
      ELSE 50
    END ASC,
    CASE WHEN NOT v_has_sections AND v_proposal_id IS NOT NULL AND e.ai_rank IS NOT NULL THEN 0 ELSE 1 END ASC,
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