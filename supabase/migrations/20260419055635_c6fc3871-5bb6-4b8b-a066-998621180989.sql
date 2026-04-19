-- Sprint 13: pg_cron + pg_net jako domyślny scheduler
-- ROLLBACK: DROP FUNCTION IF EXISTS public.schedule_edge_function(text,text,text,jsonb); DROP VIEW IF EXISTS public.cron_job_health; DROP EXTENSION IF EXISTS pg_net; DROP EXTENSION IF EXISTS pg_cron;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.schedule_edge_function(
  p_job_name text,
  p_cron text,
  p_function_path text,
  p_body jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, cron
AS $$
DECLARE
  v_job_id bigint;
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'service_role_key not found in vault. Add it via vault.create_secret first.';
  END IF;

  v_url := 'https://smuaroosnsrqfjsbpxpa.supabase.co/functions/v1/' || p_function_path;

  PERFORM cron.unschedule(p_job_name)
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = p_job_name);

  SELECT cron.schedule(
    p_job_name,
    p_cron,
    format(
      $cmd$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
        body := %L::jsonb
      )$cmd$,
      v_url, v_secret, p_body::text
    )
  ) INTO v_job_id;

  RETURN v_job_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.schedule_edge_function(text,text,text,jsonb) FROM PUBLIC, anon, authenticated;

-- Admin check helper (any tenant)
CREATE OR REPLACE FUNCTION public.is_admin_anywhere(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'::app_role
  );
$$;

CREATE OR REPLACE VIEW public.cron_job_health
WITH (security_invoker = true)
AS
SELECT
  j.jobname,
  j.schedule,
  j.active,
  d.runid,
  d.status,
  d.return_message,
  d.start_time,
  d.end_time
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT * FROM cron.job_run_details d2
  WHERE d2.jobid = j.jobid
  ORDER BY d2.start_time DESC
  LIMIT 5
) d ON true
WHERE public.is_admin_anywhere(auth.uid());

GRANT SELECT ON public.cron_job_health TO authenticated;