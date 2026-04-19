-- SGU-07 — Część A (adaptacja istniejącej tabeli)

-- 1. Dodaj brakujące kolumny do sgu_web_sources
ALTER TABLE public.sgu_web_sources
  ADD COLUMN IF NOT EXISTS parser_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sgu_web_sources
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_sgu_web_sources_tenant_active
  ON public.sgu_web_sources(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_sgu_web_sources_last_scraped
  ON public.sgu_web_sources(last_scraped_at NULLS FIRST);

ALTER TABLE public.sgu_web_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sgu_web_sources_select" ON public.sgu_web_sources;
DROP POLICY IF EXISTS "sgu_web_sources_insert" ON public.sgu_web_sources;
DROP POLICY IF EXISTS "sgu_web_sources_update" ON public.sgu_web_sources;
DROP POLICY IF EXISTS "sgu_web_sources_delete" ON public.sgu_web_sources;

CREATE POLICY "sgu_web_sources_select"
  ON public.sgu_web_sources FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin())
  );

CREATE POLICY "sgu_web_sources_insert"
  ON public.sgu_web_sources FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin())
  );

CREATE POLICY "sgu_web_sources_update"
  ON public.sgu_web_sources FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin())
  );

CREATE POLICY "sgu_web_sources_delete"
  ON public.sgu_web_sources FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (public.is_sgu_partner() OR public.is_superadmin())
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_sgu_web_sources_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tr_sgu_web_sources_updated_at ON public.sgu_web_sources;
CREATE TRIGGER tr_sgu_web_sources_updated_at
  BEFORE UPDATE ON public.sgu_web_sources
  FOR EACH ROW EXECUTE FUNCTION public.tg_sgu_web_sources_updated_at();

-- 2. sgu_web_source_runs (audit log)
CREATE TABLE IF NOT EXISTS public.sgu_web_source_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  source_id uuid NOT NULL REFERENCES public.sgu_web_sources(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.background_jobs(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  items_found integer NOT NULL DEFAULT 0,
  candidates_added integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error text
);

CREATE INDEX IF NOT EXISTS idx_sgu_web_source_runs_source
  ON public.sgu_web_source_runs(source_id, started_at DESC);

ALTER TABLE public.sgu_web_source_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sgu_web_source_runs_select" ON public.sgu_web_source_runs;
CREATE POLICY "sgu_web_source_runs_select"
  ON public.sgu_web_source_runs FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin())
  );

-- 3. Update sgu_next_prospecting_job — add p_job_type param
CREATE OR REPLACE FUNCTION public.sgu_next_prospecting_job(p_job_type text DEFAULT 'sgu_krs_prospecting')
RETURNS TABLE(id uuid, tenant_id uuid, actor_user_id uuid, payload jsonb, result jsonb, status text, progress integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_job_id uuid;
BEGIN
  SELECT bj.id INTO v_job_id
  FROM public.background_jobs bj
  WHERE bj.job_type = p_job_type
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
$function$;

-- ROLLBACK:
-- DROP TABLE public.sgu_web_source_runs;
-- ALTER TABLE public.sgu_web_sources DROP COLUMN parser_config, DROP COLUMN updated_at;