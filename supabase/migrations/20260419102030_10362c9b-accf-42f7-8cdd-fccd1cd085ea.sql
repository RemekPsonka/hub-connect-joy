
-- Sprint 19c-α A1: backup tabeli companies przed jakimikolwiek zmianami legacy kolumn
-- Sekcje A2-A5 (backfill, drop trigger, refactor FE, RENAME kolumn) wykonamy w osobnym sprincie 19c-β
-- ze względu na rozległy refactor FE (8+ plików: CompanyPipelineController, useCompanyAnalysisQueries, CompanyModal, CompanyView, SourcesTabContent).

CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive.companies_backup_20260419 AS
  SELECT * FROM public.companies;

DO $$
DECLARE
  src_cnt bigint;
  bak_cnt bigint;
BEGIN
  SELECT COUNT(*) INTO src_cnt FROM public.companies;
  SELECT COUNT(*) INTO bak_cnt FROM archive.companies_backup_20260419;
  RAISE NOTICE 'companies: source=% backup=%', src_cnt, bak_cnt;
  IF src_cnt <> bak_cnt THEN
    RAISE EXCEPTION 'Backup row count mismatch: source=% backup=%', src_cnt, bak_cnt;
  END IF;
END $$;

COMMENT ON TABLE archive.companies_backup_20260419 IS
  'Sprint 19c-α: pelny snapshot public.companies przed planowanym refactorem dual-write (sprint 19c-β). Zachowac min. 90 dni.';

-- ROLLBACK:
-- DROP TABLE IF EXISTS archive.companies_backup_20260419;
