-- Sprint 08 — Companies 2.0 schema
-- ROLLBACK: DROP TRIGGER IF EXISTS trg_sync_company_data_sources ON public.companies;
--           DROP FUNCTION IF EXISTS public.sync_company_data_sources();
--           DROP INDEX IF EXISTS public.uniq_companies_tenant_nip;
--           DROP INDEX IF EXISTS public.uniq_companies_tenant_krs;
--           DROP TABLE IF EXISTS public.company_data_sources;

-- 1. Archive
CREATE SCHEMA IF NOT EXISTS archive;

DO $$
DECLARE
  v_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='archive' AND table_name='companies_backup_20260418'
  ) THEN
    EXECUTE 'CREATE TABLE archive.companies_backup_20260418 AS SELECT * FROM public.companies';
  END IF;
  SELECT count(*) INTO v_count FROM archive.companies_backup_20260418;
  RAISE NOTICE 'archive.companies_backup_20260418 rows: %', v_count;
END $$;

-- 2. New consolidated data sources table
CREATE TABLE IF NOT EXISTS public.company_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('external_api','www','financial_3y','ai_analysis','source_data_api','other')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text,
  fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, source_type)
);

CREATE INDEX IF NOT EXISTS idx_company_data_sources_company ON public.company_data_sources(company_id, source_type);
CREATE INDEX IF NOT EXISTS idx_company_data_sources_tenant  ON public.company_data_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_data_sources_data_gin ON public.company_data_sources USING GIN (data);

ALTER TABLE public.company_data_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_data_sources_select_tenant" ON public.company_data_sources;
DROP POLICY IF EXISTS "company_data_sources_insert_tenant" ON public.company_data_sources;
DROP POLICY IF EXISTS "company_data_sources_update_tenant" ON public.company_data_sources;
DROP POLICY IF EXISTS "company_data_sources_delete_tenant" ON public.company_data_sources;

CREATE POLICY "company_data_sources_select_tenant"
  ON public.company_data_sources FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "company_data_sources_insert_tenant"
  ON public.company_data_sources FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "company_data_sources_update_tenant"
  ON public.company_data_sources FOR UPDATE TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "company_data_sources_delete_tenant"
  ON public.company_data_sources FOR DELETE TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_company_data_sources_updated_at ON public.company_data_sources;
CREATE TRIGGER trg_company_data_sources_updated_at
  BEFORE UPDATE ON public.company_data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Backfill from legacy columns
INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
SELECT tenant_id, id, 'external_api', external_data, external_data_status, external_data_date
FROM public.companies
WHERE external_data IS NOT NULL AND external_data::text NOT IN ('null','{}','[]')
ON CONFLICT (company_id, source_type) DO NOTHING;

INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
SELECT tenant_id, id, 'www', www_data, www_data_status, www_data_date
FROM public.companies
WHERE www_data IS NOT NULL AND www_data::text NOT IN ('null','{}','[]')
ON CONFLICT (company_id, source_type) DO NOTHING;

INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
SELECT tenant_id, id, 'financial_3y', financial_data_3y, financial_data_status, financial_data_date
FROM public.companies
WHERE financial_data_3y IS NOT NULL AND financial_data_3y::text NOT IN ('null','{}','[]')
ON CONFLICT (company_id, source_type) DO NOTHING;

INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
SELECT tenant_id, id, 'ai_analysis', ai_analysis, company_analysis_status, company_analysis_date
FROM public.companies
WHERE ai_analysis IS NOT NULL AND ai_analysis::text NOT IN ('null','{}','[]')
ON CONFLICT (company_id, source_type) DO NOTHING;

INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
SELECT tenant_id, id, 'source_data_api', source_data_api, source_data_status, source_data_date
FROM public.companies
WHERE source_data_api IS NOT NULL AND source_data_api::text NOT IN ('null','{}','[]')
ON CONFLICT (company_id, source_type) DO NOTHING;

-- 4. UNIQUE indexes (guarded by duplicate check)
DO $$
DECLARE
  v_dup_nip integer;
  v_dup_krs integer;
BEGIN
  SELECT count(*) INTO v_dup_nip FROM (
    SELECT tenant_id, nip FROM public.companies
    WHERE nip IS NOT NULL AND nip <> ''
    GROUP BY tenant_id, nip HAVING count(*) > 1
  ) d;
  SELECT count(*) INTO v_dup_krs FROM (
    SELECT tenant_id, krs FROM public.companies
    WHERE krs IS NOT NULL AND krs <> ''
    GROUP BY tenant_id, krs HAVING count(*) > 1
  ) d;

  IF v_dup_nip = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_companies_tenant_nip
      ON public.companies (tenant_id, nip)
      WHERE nip IS NOT NULL AND nip <> '';
  ELSE
    RAISE NOTICE 'Skipping uniq_companies_tenant_nip: % duplicate (tenant_id, nip) groups exist', v_dup_nip;
  END IF;

  IF v_dup_krs = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_companies_tenant_krs
      ON public.companies (tenant_id, krs)
      WHERE krs IS NOT NULL AND krs <> '';
  ELSE
    RAISE NOTICE 'Skipping uniq_companies_tenant_krs: % duplicate (tenant_id, krs) groups exist', v_dup_krs;
  END IF;
END $$;

-- 5. Sync trigger: mirror legacy column changes to company_data_sources
CREATE OR REPLACE FUNCTION public.sync_company_data_sources()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- external_api
  IF NEW.external_data IS DISTINCT FROM OLD.external_data
     OR NEW.external_data_status IS DISTINCT FROM OLD.external_data_status
     OR NEW.external_data_date IS DISTINCT FROM OLD.external_data_date THEN
    IF NEW.external_data IS NOT NULL AND NEW.external_data::text NOT IN ('null','{}','[]') THEN
      INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
      VALUES (NEW.tenant_id, NEW.id, 'external_api', NEW.external_data, NEW.external_data_status, NEW.external_data_date)
      ON CONFLICT (company_id, source_type) DO UPDATE
        SET data = EXCLUDED.data, status = EXCLUDED.status, fetched_at = EXCLUDED.fetched_at, updated_at = now();
    END IF;
  END IF;

  -- www
  IF NEW.www_data IS DISTINCT FROM OLD.www_data
     OR NEW.www_data_status IS DISTINCT FROM OLD.www_data_status
     OR NEW.www_data_date IS DISTINCT FROM OLD.www_data_date THEN
    IF NEW.www_data IS NOT NULL AND NEW.www_data::text NOT IN ('null','{}','[]') THEN
      INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
      VALUES (NEW.tenant_id, NEW.id, 'www', NEW.www_data, NEW.www_data_status, NEW.www_data_date)
      ON CONFLICT (company_id, source_type) DO UPDATE
        SET data = EXCLUDED.data, status = EXCLUDED.status, fetched_at = EXCLUDED.fetched_at, updated_at = now();
    END IF;
  END IF;

  -- financial_3y
  IF NEW.financial_data_3y IS DISTINCT FROM OLD.financial_data_3y
     OR NEW.financial_data_status IS DISTINCT FROM OLD.financial_data_status
     OR NEW.financial_data_date IS DISTINCT FROM OLD.financial_data_date THEN
    IF NEW.financial_data_3y IS NOT NULL AND NEW.financial_data_3y::text NOT IN ('null','{}','[]') THEN
      INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
      VALUES (NEW.tenant_id, NEW.id, 'financial_3y', NEW.financial_data_3y, NEW.financial_data_status, NEW.financial_data_date)
      ON CONFLICT (company_id, source_type) DO UPDATE
        SET data = EXCLUDED.data, status = EXCLUDED.status, fetched_at = EXCLUDED.fetched_at, updated_at = now();
    END IF;
  END IF;

  -- ai_analysis
  IF NEW.ai_analysis IS DISTINCT FROM OLD.ai_analysis
     OR NEW.company_analysis_status IS DISTINCT FROM OLD.company_analysis_status
     OR NEW.company_analysis_date IS DISTINCT FROM OLD.company_analysis_date THEN
    IF NEW.ai_analysis IS NOT NULL AND NEW.ai_analysis::text NOT IN ('null','{}','[]') THEN
      INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
      VALUES (NEW.tenant_id, NEW.id, 'ai_analysis', NEW.ai_analysis, NEW.company_analysis_status, NEW.company_analysis_date)
      ON CONFLICT (company_id, source_type) DO UPDATE
        SET data = EXCLUDED.data, status = EXCLUDED.status, fetched_at = EXCLUDED.fetched_at, updated_at = now();
    END IF;
  END IF;

  -- source_data_api
  IF NEW.source_data_api IS DISTINCT FROM OLD.source_data_api
     OR NEW.source_data_status IS DISTINCT FROM OLD.source_data_status
     OR NEW.source_data_date IS DISTINCT FROM OLD.source_data_date THEN
    IF NEW.source_data_api IS NOT NULL AND NEW.source_data_api::text NOT IN ('null','{}','[]') THEN
      INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, status, fetched_at)
      VALUES (NEW.tenant_id, NEW.id, 'source_data_api', NEW.source_data_api, NEW.source_data_status, NEW.source_data_date)
      ON CONFLICT (company_id, source_type) DO UPDATE
        SET data = EXCLUDED.data, status = EXCLUDED.status, fetched_at = EXCLUDED.fetched_at, updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_company_data_sources ON public.companies;
CREATE TRIGGER trg_sync_company_data_sources
  AFTER UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.sync_company_data_sources();