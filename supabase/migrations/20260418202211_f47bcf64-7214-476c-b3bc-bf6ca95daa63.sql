CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.functions_snapshot_20260418 AS
  SELECT routine_name, routine_type, data_type
  FROM information_schema.routines WHERE routine_schema = 'public';

CREATE OR REPLACE FUNCTION public.rpc_task_analytics(
  p_range jsonb,
  p_filters jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH filtered AS (
    SELECT t.status, t.due_date
    FROM public.tasks t
    WHERE t.tenant_id = public.get_current_tenant_id()
      AND t.created_at >= (p_range->>'from')::timestamptz
      AND t.created_at <  (p_range->>'to')::timestamptz
      AND (p_filters->>'assigned_to' IS NULL OR t.assigned_to::text = p_filters->>'assigned_to')
      AND (p_filters->>'status' IS NULL OR t.status = p_filters->>'status')
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'completed', (SELECT count(*) FROM filtered WHERE status = 'done'),
    'overdue',   (SELECT count(*) FROM filtered WHERE due_date < current_date AND status <> 'done'),
    'by_status', COALESCE((
      SELECT jsonb_object_agg(status, c) FROM (
        SELECT COALESCE(status,'unknown') AS status, count(*)::int AS c
        FROM filtered GROUP BY 1
      ) s
    ), '{}'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.rpc_team_report(
  p_week_start date,
  p_team_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'week_start', p_week_start,
    'team_id', p_team_id,
    'deals_created', (
      SELECT count(*) FROM public.deal_team_contacts dtc
      WHERE dtc.tenant_id = public.get_current_tenant_id()
        AND (p_team_id IS NULL OR dtc.team_id = p_team_id)
        AND dtc.created_at >= p_week_start
        AND dtc.created_at <  p_week_start + interval '7 days'
    ),
    'meetings_held', (
      SELECT count(*) FROM public.consultations c
      WHERE c.tenant_id = public.get_current_tenant_id()
        AND c.scheduled_at >= p_week_start
        AND c.scheduled_at <  p_week_start + interval '7 days'
    ),
    'tasks_completed', (
      SELECT count(*) FROM public.tasks t
      WHERE t.tenant_id = public.get_current_tenant_id()
        AND t.status = 'done'
        AND t.updated_at >= p_week_start
        AND t.updated_at <  p_week_start + interval '7 days'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_task_analytics(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_team_report(date, uuid) TO authenticated;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.rpc_task_analytics(jsonb, jsonb);
-- DROP FUNCTION IF EXISTS public.rpc_team_report(date, uuid);