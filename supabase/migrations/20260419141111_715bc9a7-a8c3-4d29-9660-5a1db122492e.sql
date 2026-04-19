CREATE OR REPLACE FUNCTION public.rpc_sgu_get_snapshot(p_id uuid)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  team_id uuid,
  period_type text,
  period_start date,
  period_end date,
  data jsonb,
  generated_at timestamptz,
  generated_by text,
  generated_by_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.id, s.tenant_id, s.team_id, s.period_type, s.period_start, s.period_end,
         s.data, s.generated_at, s.generated_by, s.generated_by_user_id
  FROM public.sgu_reports_snapshots s
  WHERE s.id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_sgu_get_snapshot(uuid) TO authenticated;