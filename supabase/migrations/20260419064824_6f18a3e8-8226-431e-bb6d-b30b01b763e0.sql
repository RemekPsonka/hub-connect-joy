CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive.functions_routines_snapshot_20260419 AS
SELECT routine_schema, routine_name, routine_type, created
FROM information_schema.routines
WHERE routine_schema IN ('public');

CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.directors(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_pending
  ON public.background_jobs (job_type, created_at)
  WHERE status IN ('pending','running');

CREATE INDEX IF NOT EXISTS idx_background_jobs_actor_recent
  ON public.background_jobs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_background_jobs_tenant
  ON public.background_jobs (tenant_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_background_jobs_updated_at ON public.background_jobs;
CREATE TRIGGER trg_background_jobs_updated_at
  BEFORE UPDATE ON public.background_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bg_jobs_select_tenant" ON public.background_jobs;
CREATE POLICY "bg_jobs_select_tenant"
  ON public.background_jobs FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "bg_jobs_insert_tenant" ON public.background_jobs;
CREATE POLICY "bg_jobs_insert_tenant"
  ON public.background_jobs FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS "bg_jobs_update_tenant" ON public.background_jobs;
CREATE POLICY "bg_jobs_update_tenant"
  ON public.background_jobs FOR UPDATE
  USING (tenant_id = public.get_current_tenant_id());

ALTER TABLE public.background_jobs REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'background_jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.background_jobs';
  END IF;
END $$;

SELECT public.schedule_edge_function(
  'enrich_company_worker_1min',
  '* * * * *',
  '/functions/v1/enrich-company-worker',
  '{}'::jsonb
);

-- ROLLBACK:
-- SELECT cron.unschedule('enrich_company_worker_1min');
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.background_jobs;
-- DROP TABLE public.background_jobs;
-- DROP TABLE archive.functions_routines_snapshot_20260419;