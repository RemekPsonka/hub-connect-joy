CREATE OR REPLACE FUNCTION public.rpc_dashboard_myday()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_tenant uuid;
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_tasks_overdue jsonb;
  v_consultations_today jsonb;
  v_tasks_today_count int;
BEGIN
  v_actor := public.get_current_director_id();
  v_tenant := public.get_current_tenant_id();

  IF v_actor IS NULL THEN
    RETURN jsonb_build_object(
      'tasks_overdue', '[]'::jsonb,
      'consultations_today', '[]'::jsonb,
      'top_ai_recs', '[]'::jsonb,
      'deals_recent_changes', '[]'::jsonb,
      'tasks_today_count', 0
    );
  END IF;

  v_today_start := date_trunc('day', now());
  v_today_end := v_today_start + interval '1 day';

  SELECT COALESCE(jsonb_agg(t ORDER BY t->>'due_date' ASC), '[]'::jsonb)
  INTO v_tasks_overdue
  FROM (
    SELECT jsonb_build_object(
      'id', tk.id,
      'title', tk.title,
      'due_date', tk.due_date,
      'priority', tk.priority,
      'contact_id', co.id,
      'contact_name', co.full_name,
      'company_name', COALESCE(comp.short_name, comp.name)
    ) AS t,
    tk.due_date
    FROM public.tasks tk
    LEFT JOIN LATERAL (
      SELECT contact_id FROM public.task_contacts WHERE task_id = tk.id ORDER BY created_at ASC LIMIT 1
    ) tc ON true
    LEFT JOIN public.contacts co ON co.id = tc.contact_id
    LEFT JOIN public.companies comp ON comp.id = co.company_id
    WHERE tk.owner_id = v_actor
      AND tk.status NOT IN ('done', 'completed', 'cancelled')
      AND tk.due_date IS NOT NULL
      AND tk.due_date < CURRENT_DATE
    ORDER BY tk.due_date ASC
    LIMIT 5
  ) sub;

  SELECT COALESCE(jsonb_agg(c ORDER BY c->>'scheduled_at' ASC), '[]'::jsonb)
  INTO v_consultations_today
  FROM (
    SELECT jsonb_build_object(
      'id', cons.id,
      'scheduled_at', cons.scheduled_at,
      'contact_id', cons.contact_id,
      'contact_name', co.full_name,
      'location', cons.location,
      'is_virtual', cons.is_virtual,
      'status', cons.status
    ) AS c
    FROM public.consultations cons
    LEFT JOIN public.contacts co ON co.id = cons.contact_id
    WHERE cons.director_id = v_actor
      AND cons.scheduled_at >= v_today_start
      AND cons.scheduled_at < v_today_end
    ORDER BY cons.scheduled_at ASC
    LIMIT 5
  ) sub;

  SELECT COUNT(*)::int INTO v_tasks_today_count
  FROM public.tasks
  WHERE owner_id = v_actor
    AND status NOT IN ('done', 'completed', 'cancelled')
    AND due_date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'tasks_overdue', v_tasks_overdue,
    'consultations_today', v_consultations_today,
    'top_ai_recs', '[]'::jsonb,
    'deals_recent_changes', '[]'::jsonb,
    'tasks_today_count', v_tasks_today_count,
    'generated_at', now()
  );
END;
$function$;

-- ROLLBACK: przywróć poprzednią wersję bez contact_id/contact_name/company_name w tasks_overdue.