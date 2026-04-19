-- SGU-06: Helper RPC dla workera prospectingu (FOR UPDATE SKIP LOCKED)
-- Pobiera 1 pending/processing job typu sgu_krs_prospecting i ustawia status='processing'
CREATE OR REPLACE FUNCTION public.sgu_next_prospecting_job()
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  actor_user_id uuid,
  payload jsonb,
  result jsonb,
  status text,
  progress integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  -- Atomic: lock + select 1 candidate job
  SELECT bj.id INTO v_job_id
  FROM public.background_jobs bj
  WHERE bj.job_type = 'sgu_krs_prospecting'
    AND bj.status IN ('pending', 'processing')
    AND (bj.status = 'pending' OR bj.updated_at < now() - interval '5 minutes')
  ORDER BY bj.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.background_jobs
  SET status = 'processing',
      started_at = COALESCE(started_at, now()),
      updated_at = now()
  WHERE background_jobs.id = v_job_id;

  RETURN QUERY
  SELECT bj.id, bj.tenant_id, bj.actor_user_id, bj.payload, bj.result, bj.status, bj.progress
  FROM public.background_jobs bj
  WHERE bj.id = v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sgu_next_prospecting_job() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sgu_next_prospecting_job() TO service_role;

COMMENT ON FUNCTION public.sgu_next_prospecting_job() IS
  'SGU-06: Worker helper. Pobiera 1 pending/stuck job typu sgu_krs_prospecting z FOR UPDATE SKIP LOCKED. Tylko service_role.';

-- ROLLBACK: DROP FUNCTION IF EXISTS public.sgu_next_prospecting_job();