-- ============================================================================
-- AS-BUILT (2026-07-02) — Konsolidacja: audyt spójności + KANON TAKSONOMII + CZYSTY CRM
-- Baza JUŻ zawiera ten stan (wykonano przez connector). Migracja idempotentna.
-- ============================================================================

-- A) NAPRAWY FUNKCJI

CREATE OR REPLACE FUNCTION public.require_director_on_dtc_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dtc_assignee uuid;
  v_contact_name text;
BEGIN
  IF NEW.deal_team_contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT dtc.assigned_to,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), c.company, 'kontakt')
  INTO v_dtc_assignee, v_contact_name
  FROM public.deal_team_contacts dtc
  LEFT JOIN public.contacts c ON c.id = dtc.contact_id
  WHERE dtc.id = NEW.deal_team_contact_id;

  IF v_dtc_assignee IS NULL THEN
    RAISE EXCEPTION 'Kontakt "%" nie ma przypisanego dyrektora. Przypisz dyrektora przed dodaniem zadania.',
      COALESCE(v_contact_name, 'kontakt') USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_sgu_accept_prospecting_candidate(p_candidate_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_team uuid;
  v_candidate public.sgu_prospecting_candidates%ROWTYPE;
  v_new_contact_id uuid;
  v_new_dtc_id uuid;
BEGIN
  IF NOT (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'forbidden: no SGU access';
  END IF;

  v_tenant := public.get_current_tenant_id();
  v_team := public.get_sgu_team_id();

  SELECT * INTO v_candidate FROM public.sgu_prospecting_candidates
  WHERE id = p_candidate_id AND tenant_id = v_tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidate_not_found';
  END IF;

  IF v_candidate.status <> 'pending_review' THEN
    RAISE EXCEPTION 'already_processed: status=%', v_candidate.status;
  END IF;

  IF v_candidate.nip IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.deal_team_contacts dtc
      JOIN public.contacts c ON c.id = dtc.contact_id
      WHERE dtc.team_id = v_team
        AND c.tenant_id = v_tenant
        AND (c.full_name ILIKE '%' || v_candidate.name || '%' OR c.phone = v_candidate.phone)
    ) THEN
      UPDATE public.sgu_prospecting_candidates
      SET status = 'duplicate', reviewed_at = now(), reviewed_by_user_id = auth.uid()
      WHERE id = p_candidate_id;
      RETURN jsonb_build_object('status', 'duplicate', 'candidate_id', p_candidate_id);
    END IF;
  END IF;

  INSERT INTO public.contacts (tenant_id, full_name, phone, email, source)
  VALUES (
    v_tenant, v_candidate.name, v_candidate.phone, v_candidate.email,
    'sgu_krs_prospecting'
  )
  RETURNING id INTO v_new_contact_id;

  INSERT INTO public.deal_team_contacts (
    tenant_id, team_id, contact_id, source_contact_id,
    category, status, notes
  ) VALUES (
    v_tenant, v_team, v_new_contact_id, NULL,
    'lead', 'new',
    format('Z KRS prospectingu: %s, PKD %s, %s. AI score: %s. %s',
      v_candidate.name, v_candidate.primary_pkd,
      COALESCE(v_candidate.address_city, ''),
      COALESCE(v_candidate.ai_score::text, 'n/a'),
      COALESCE(v_candidate.ai_reasoning, ''))
  )
  RETURNING id INTO v_new_dtc_id;

  UPDATE public.sgu_prospecting_candidates
  SET status = 'added_as_lead',
      reviewed_at = now(),
      reviewed_by_user_id = auth.uid(),
      added_as_deal_team_contact_id = v_new_dtc_id
  WHERE id = p_candidate_id;

  RETURN jsonb_build_object(
    'status', 'added_as_lead',
    'deal_team_contact_id', v_new_dtc_id,
    'contact_id', v_new_contact_id
  );
END;
$function$;

-- B) DROP martwych triggerów i funkcji

DROP TRIGGER IF EXISTS trg_handle_recurring_task ON public.tasks;
DROP TRIGGER IF EXISTS trg_task_status_notify ON public.tasks;
DROP TRIGGER IF EXISTS trg_task_comment_notify ON public.task_comments;
DROP TRIGGER IF EXISTS recalc_health_on_contact_update ON public.contacts;
DROP TRIGGER IF EXISTS validate_review_frequency_trigger ON public.deal_team_contacts;

DROP FUNCTION IF EXISTS public.validate_review_frequency();
DROP FUNCTION IF EXISTS public.sync_company_data_sources();
DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);
DROP FUNCTION IF EXISTS public.sgu_next_prospecting_job(text);
DROP FUNCTION IF EXISTS public.trigger_update_relationship_health();
DROP FUNCTION IF EXISTS public.calculate_relationship_health(uuid);

-- C) CREATE OR REPLACE aktualnych funkcji

CREATE OR REPLACE FUNCTION public.get_odprawa_agenda(p_team_id uuid, p_mode text DEFAULT 'standard'::text)
 RETURNS TABLE(contact_id uuid, contact_name text, company_name text, stage text, temperature text, is_lost boolean, next_action_date timestamp with time zone, last_status_update timestamp with time zone, priority_bucket text, priority_rank integer, active_task_count bigint, ai_reason text, ai_section_key text, ai_section_label text, ai_section_icon text)
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
      d.offering_stage,
      d.temperature,
      d.is_lost,
      d.next_action_date::timestamptz AS next_action_date,
      d.last_status_update
    FROM public.deal_team_contacts d
    WHERE d.team_id = p_team_id
      AND COALESCE(d.is_lost, false) = false
      AND d.category <> 'client'
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
      COALESCE(NULLIF(TRIM(c.full_name), ''), NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), 'Bez nazwy') AS contact_name,
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
        WHEN dtc.offering_stage IS NOT NULL
             AND dtc.offering_stage NOT IN ('won', 'lost')
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

CREATE OR REPLACE FUNCTION public.convert_to_client(p_dtc_id uuid, p_areas jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_property_active      bool := COALESCE((p_areas->'property'->>'active')::bool, false);
  v_financial_active     bool := COALESCE((p_areas->'financial'->>'active')::bool, false);
  v_communication_active bool := COALESCE((p_areas->'communication'->>'active')::bool, false);
  v_life_group_active    bool := COALESCE((p_areas->'life_group'->>'active')::bool, false);

  v_property_premium_gr      bigint := COALESCE(((p_areas->'property'->>'annualPremiumPln')::numeric * 100)::bigint, 0);
  v_financial_premium_gr     bigint := COALESCE(((p_areas->'financial'->>'annualPremiumPln')::numeric * 100)::bigint, 0);
  v_communication_premium_gr bigint := COALESCE(((p_areas->'communication'->>'annualPremiumPln')::numeric * 100)::bigint, 0);
  v_life_group_premium_gr    bigint := COALESCE(((p_areas->'life_group'->>'annualPremiumPln')::numeric * 100)::bigint, 0);

  v_total_premium_gr bigint :=
    (CASE WHEN v_property_active      THEN v_property_premium_gr      ELSE 0 END) +
    (CASE WHEN v_financial_active     THEN v_financial_premium_gr     ELSE 0 END) +
    (CASE WHEN v_communication_active THEN v_communication_premium_gr ELSE 0 END) +
    (CASE WHEN v_life_group_active    THEN v_life_group_premium_gr    ELSE 0 END);
BEGIN
  IF NOT (v_property_active OR v_financial_active OR v_communication_active OR v_life_group_active) THEN
    RAISE EXCEPTION 'Konwersja na klienta wymaga zaznaczenia minimum jednego obszaru.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.deal_team_contacts SET
    category       = 'client',
    status         = 'won',
    won_at         = COALESCE(won_at, now()),
    offering_stage = 'won',
    last_status_update = now(),
    client_complexity = jsonb_build_object(
      'property_active',      v_property_active,
      'financial_active',     v_financial_active,
      'communication_active', v_communication_active,
      'life_group_active',    v_life_group_active,
      'referrals_count',      COALESCE((client_complexity->>'referrals_count')::int, 0),
      'references_count',     COALESCE((client_complexity->>'references_count')::int, 0)
    ),
    potential_property_gr      = CASE WHEN v_property_active      THEN v_property_premium_gr      ELSE 0 END,
    potential_financial_gr     = CASE WHEN v_financial_active     THEN v_financial_premium_gr     ELSE 0 END,
    potential_communication_gr = CASE WHEN v_communication_active THEN v_communication_premium_gr ELSE 0 END,
    potential_life_group_gr    = CASE WHEN v_life_group_active    THEN v_life_group_premium_gr    ELSE 0 END,
    expected_annual_premium_gr = v_total_premium_gr,
    updated_at = now()
  WHERE id = p_dtc_id;

  UPDATE public.tasks
  SET status = 'completed',
      updated_at = now()
  WHERE deal_team_contact_id = p_dtc_id
    AND status IN ('todo', 'in_progress');
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_meeting_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.decision_type = 'go' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date    = NEW.next_action_date,
           k1_meeting_done_at  = COALESCE(k1_meeting_done_at, now()),
           last_status_update  = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'postponed' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date    = NEW.postponed_until,
           k1_meeting_done_at  = COALESCE(k1_meeting_done_at, now()),
           last_status_update  = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type IN ('dead', 'kill') THEN
    UPDATE public.deal_team_contacts
       SET is_lost            = true,
           lost_reason        = NEW.dead_reason,
           lost_at            = COALESCE(lost_at, now()),
           status             = 'disqualified',
           next_action_date   = NULL,
           next_action        = NULL,
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'push' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date = COALESCE(
             NEW.postponed_until,
             (NEW.decision_data->>'postponed_until')::date,
             (now() + interval '7 days')::date
           ),
           snoozed_until    = COALESCE(
             NEW.postponed_until::timestamptz,
             (NEW.decision_data->>'postponed_until')::timestamptz,
             now() + interval '7 days'
           ),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'pivot' THEN
    UPDATE public.deal_team_contacts
       SET offering_stage     = 'decision_meeting',
           next_action_date   = COALESCE(NEW.next_action_date, (now() + interval '7 days')::date),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'nurture' THEN
    UPDATE public.deal_team_contacts
       SET temperature        = '10x',
           k1_meeting_done_at = COALESCE(k1_meeting_done_at, now()),
           next_action_date   = COALESCE(NEW.next_action_date, (now() + interval '30 days')::date),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;
  END IF;

  IF NEW.follow_up_task_id IS NOT NULL
     AND NEW.decision_type IN ('go','dead','kill','pivot')
  THEN
    UPDATE public.tasks
       SET status = 'completed', updated_at = now()
     WHERE id = NEW.follow_up_task_id
       AND status IS DISTINCT FROM 'completed';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_deal_team_contact_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS TABLE(total_contacts bigint, new_contacts_30d bigint, contacts_prev_30d bigint, today_consultations bigint, pending_tasks bigint, active_needs bigint, active_offers bigint, pending_matches bigint, upcoming_meetings bigint, refreshed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID := get_current_tenant_id();
  v_director_id UUID := get_current_director_id();
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_tenant_admin(auth.uid(), v_tenant_id) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN QUERY
    SELECT
      mv.total_contacts, mv.new_contacts_30d, mv.contacts_prev_30d,
      mv.today_consultations, mv.pending_tasks, mv.active_needs,
      mv.active_offers, mv.pending_matches, mv.upcoming_meetings,
      mv.refreshed_at
    FROM mv_dashboard_stats mv
    WHERE mv.tenant_id = v_tenant_id;
  ELSE
    RETURN QUERY SELECT
      (SELECT COUNT(*) FROM contacts c
       WHERE c.tenant_id = v_tenant_id
       AND c.is_active = true
       AND (c.director_id = v_director_id
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,

      (SELECT COUNT(*) FROM contacts c
       WHERE c.tenant_id = v_tenant_id
       AND c.is_active = true
       AND c.created_at >= NOW() - INTERVAL '30 days'
       AND (c.director_id = v_director_id
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,

      (SELECT COUNT(*) FROM contacts c
       WHERE c.tenant_id = v_tenant_id
       AND c.is_active = true
       AND c.created_at >= NOW() - INTERVAL '60 days'
       AND c.created_at < NOW() - INTERVAL '30 days'
       AND (c.director_id = v_director_id
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,

      (SELECT COUNT(*) FROM consultations co
       WHERE co.tenant_id = v_tenant_id
       AND co.director_id = v_director_id
       AND co.scheduled_at::date = CURRENT_DATE)::bigint,

      (SELECT COUNT(*) FROM tasks tk
       WHERE tk.tenant_id = v_tenant_id
       AND tk.status IN ('todo', 'in_progress')
       AND (tk.owner_id = v_director_id OR tk.assigned_to = v_director_id))::bigint,

      (SELECT COUNT(*) FROM needs n
       JOIN contacts c ON c.id = n.contact_id
       WHERE n.tenant_id = v_tenant_id
       AND n.status = 'active'
       AND (c.director_id = v_director_id
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,

      (SELECT COUNT(*) FROM offers o
       JOIN contacts c ON c.id = o.contact_id
       WHERE o.tenant_id = v_tenant_id
       AND o.status = 'active'
       AND (c.director_id = v_director_id
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,

      0::bigint,

      (SELECT COUNT(*) FROM group_meetings gm
       WHERE gm.tenant_id = v_tenant_id
       AND gm.status = 'upcoming')::bigint,

      NOW();
  END IF;
END;
$function$;

-- D) Partycje audit_log_2027_* + REVOKE

CREATE TABLE IF NOT EXISTS public.audit_log_2027_01 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_02 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_03 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_04 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-05-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_05 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-05-01 00:00:00+00') TO ('2027-06-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_06 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-06-01 00:00:00+00') TO ('2027-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_07 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-07-01 00:00:00+00') TO ('2027-08-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_08 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-08-01 00:00:00+00') TO ('2027-09-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_09 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-09-01 00:00:00+00') TO ('2027-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_10 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-10-01 00:00:00+00') TO ('2027-11-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_11 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-11-01 00:00:00+00') TO ('2027-12-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS public.audit_log_2027_12 PARTITION OF public.audit_log
  FOR VALUES FROM ('2027-12-01 00:00:00+00') TO ('2028-01-01 00:00:00+00');

DO $$
DECLARE
  p text;
BEGIN
  FOREACH p IN ARRAY ARRAY[
    'audit_log_2027_01','audit_log_2027_02','audit_log_2027_03','audit_log_2027_04',
    'audit_log_2027_05','audit_log_2027_06','audit_log_2027_07','audit_log_2027_08',
    'audit_log_2027_09','audit_log_2027_10','audit_log_2027_11','audit_log_2027_12'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', p);
  END LOOP;

  FOREACH p IN ARRAY ARRAY[
    'ai_usage_log_2026_04','ai_usage_log_2026_05','ai_usage_log_2026_06','ai_usage_log_2026_07',
    'ai_usage_log_2026_08','ai_usage_log_2026_09','ai_usage_log_2026_10','ai_usage_log_2026_11',
    'ai_usage_log_2026_12','ai_usage_log_2027_01'
  ] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', p);
  END LOOP;
END $$;

-- E) deal_team_contacts CHECK + DROP martwych kolumn

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deal_team_contacts_category_check'
      AND conrelid = 'public.deal_team_contacts'::regclass
  ) THEN
    ALTER TABLE public.deal_team_contacts
      ADD CONSTRAINT deal_team_contacts_category_check
      CHECK (category IN ('prospect','lead','client'));
  END IF;
END $$;

ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS deprecated_deal_stage_20260623;
ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS deprecated_representative_user_id_20260623;
ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS deprecated_estimated_value_20260702;
ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS deprecated_value_currency_20260702;
ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS priority;
ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS review_frequency;
ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS status_overdue;
ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS deal_id;
ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS estimated_value;
ALTER TABLE public.deal_team_contacts DROP COLUMN IF EXISTS value_currency;

-- F) Health: DROP relationship_health + odbudowa mv_dashboard_stats

DROP TABLE IF EXISTS public.relationship_health;
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_stats;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_dashboard_stats AS
 SELECT id AS tenant_id,
    ( SELECT count(*) AS count
           FROM contacts c
          WHERE ((c.tenant_id = t.id) AND (c.is_active = true))) AS total_contacts,
    ( SELECT count(*) AS count
           FROM contacts c
          WHERE ((c.tenant_id = t.id) AND (c.is_active = true) AND (c.created_at >= (now() - '30 days'::interval)))) AS new_contacts_30d,
    ( SELECT count(*) AS count
           FROM contacts c
          WHERE ((c.tenant_id = t.id) AND (c.is_active = true) AND (c.created_at >= (now() - '60 days'::interval)) AND (c.created_at < (now() - '30 days'::interval)))) AS contacts_prev_30d,
    ( SELECT count(*) AS count
           FROM (consultations co
             JOIN contacts c ON ((c.id = co.contact_id)))
          WHERE ((c.tenant_id = t.id) AND ((co.scheduled_at)::date = CURRENT_DATE))) AS today_consultations,
    ( SELECT count(*) AS count
           FROM tasks tk
          WHERE ((tk.tenant_id = t.id) AND (tk.status = ANY (ARRAY['todo'::text, 'in_progress'::text])))) AS pending_tasks,
    ( SELECT count(*) AS count
           FROM needs n
          WHERE ((n.tenant_id = t.id) AND (n.status = 'active'::text))) AS active_needs,
    ( SELECT count(*) AS count
           FROM offers o
          WHERE ((o.tenant_id = t.id) AND (o.status = 'active'::text))) AS active_offers,
    ( SELECT count(*) AS count
           FROM matches m
          WHERE ((m.tenant_id = t.id) AND (m.status = 'pending'::text))) AS pending_matches,
    ( SELECT count(*) AS count
           FROM group_meetings gm
          WHERE ((gm.tenant_id = t.id) AND (gm.status = 'upcoming'::text))) AS upcoming_meetings,
    now() AS refreshed_at
   FROM tenants t;

CREATE UNIQUE INDEX IF NOT EXISTS mv_dashboard_stats_tenant_idx
  ON public.mv_dashboard_stats(tenant_id);

REVOKE ALL ON public.mv_dashboard_stats FROM anon, authenticated;

-- G) Dane (idempotentne)

UPDATE public.deal_team_contacts
   SET status = 'won',
       won_at = COALESCE(won_at, now())
 WHERE category = 'client'
   AND (status <> 'won' OR won_at IS NULL);

UPDATE public.deal_team_contacts
   SET category = 'prospect',
       status   = 'active'
 WHERE category = 'offering'
   AND status   = 'new';
