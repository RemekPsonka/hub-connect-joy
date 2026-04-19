-- Sprint 19c-β.1: backfill company_data_sources + drop dual-write trigger
-- Bezpieczne: bez RENAME kolumn (β.2), bez DROP funkcji (zostawiamy referencyjnie).

BEGIN;

-- 1. Snapshot 15 legacy kolumn (siatka bezpieczeństwa)
CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive.companies_legacy_cols_20260419 AS
SELECT
  id,
  ai_analysis,
  www_data, www_data_date, www_data_status,
  external_data, external_data_date, external_data_status,
  financial_data_3y, financial_data_date, financial_data_status,
  source_data_api, source_data_date, source_data_status,
  company_analysis_date, company_analysis_status
FROM public.companies;

REVOKE ALL ON archive.companies_legacy_cols_20260419 FROM anon, authenticated, public;

DO $$
DECLARE v_src bigint; v_bak bigint;
BEGIN
  SELECT count(*) INTO v_src FROM public.companies;
  SELECT count(*) INTO v_bak FROM archive.companies_legacy_cols_20260419;
  IF v_src <> v_bak THEN
    RAISE EXCEPTION 'Snapshot mismatch: source=% backup=%', v_src, v_bak;
  END IF;
  RAISE NOTICE 'Snapshot OK: % rows', v_src;
END$$;

COMMENT ON TABLE archive.companies_legacy_cols_20260419 IS
  'Sprint 19c-β.1: snapshot 15 legacy kolumn companies przed backfillem do company_data_sources i odłączeniem trigger trg_sync_company_data_sources. Zachowac do 2026-07-19.';

-- 2. Backfill company_data_sources (tylko brakujące kombinacje)
-- Mapowanie 1:1 ze schematem CHECK constraint i useCompanyDataSources.ts:
--   ai_analysis → 'ai_analysis'
--   www_data → 'www'
--   external_data → 'external_api'
--   financial_data_3y → 'financial_3y'
--   source_data_api → 'source_data_api'

INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, fetched_at, status)
SELECT c.tenant_id, c.id, 'ai_analysis', c.ai_analysis,
       COALESCE(c.company_analysis_date, c.updated_at),
       COALESCE(c.company_analysis_status, 'completed')
FROM public.companies c
WHERE c.ai_analysis IS NOT NULL
ON CONFLICT (company_id, source_type) DO NOTHING;

INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, fetched_at, status)
SELECT c.tenant_id, c.id, 'www', c.www_data,
       COALESCE(c.www_data_date, c.updated_at),
       COALESCE(c.www_data_status, 'completed')
FROM public.companies c
WHERE c.www_data IS NOT NULL
ON CONFLICT (company_id, source_type) DO NOTHING;

INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, fetched_at, status)
SELECT c.tenant_id, c.id, 'external_api', c.external_data,
       COALESCE(c.external_data_date, c.updated_at),
       COALESCE(c.external_data_status, 'completed')
FROM public.companies c
WHERE c.external_data IS NOT NULL
ON CONFLICT (company_id, source_type) DO NOTHING;

INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, fetched_at, status)
SELECT c.tenant_id, c.id, 'financial_3y', c.financial_data_3y,
       COALESCE(c.financial_data_date, c.updated_at),
       COALESCE(c.financial_data_status, 'completed')
FROM public.companies c
WHERE c.financial_data_3y IS NOT NULL
ON CONFLICT (company_id, source_type) DO NOTHING;

INSERT INTO public.company_data_sources (tenant_id, company_id, source_type, data, fetched_at, status)
SELECT c.tenant_id, c.id, 'source_data_api', c.source_data_api,
       COALESCE(c.source_data_date, c.updated_at),
       COALESCE(c.source_data_status, 'completed')
FROM public.companies c
WHERE c.source_data_api IS NOT NULL
ON CONFLICT (company_id, source_type) DO NOTHING;

-- 3. DROP TRIGGER dual-write
DROP TRIGGER IF EXISTS trg_sync_company_data_sources ON public.companies;
-- Funkcja zostaje (referencyjnie) - DROP w β.2 razem z RENAME kolumn.

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP TABLE IF EXISTS archive.companies_legacy_cols_20260419;
-- CREATE TRIGGER trg_sync_company_data_sources AFTER UPDATE ON public.companies
--   FOR EACH ROW EXECUTE FUNCTION public.sync_company_data_sources();
-- -- Backfill nie jest cofalny (ON CONFLICT DO NOTHING — wstawia tylko brakujące),
-- -- ale można usunąć rekordy stworzone w tym sprincie filtrując po fetched_at.
-- COMMIT;