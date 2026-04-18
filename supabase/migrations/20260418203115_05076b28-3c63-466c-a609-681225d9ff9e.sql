-- ============ ARCHIVE OLD BI TABLES ============
CREATE SCHEMA IF NOT EXISTS archive;

DO $$
DECLARE
  r_bi int; r_ai int; r_ver int; r_ses int; r_cbi int; r_hist int;
BEGIN
  CREATE TABLE IF NOT EXISTS archive.business_interviews_backup_20260418 AS SELECT * FROM public.business_interviews;
  CREATE TABLE IF NOT EXISTS archive.bi_ai_outputs_backup_20260418 AS SELECT * FROM public.bi_ai_outputs;
  CREATE TABLE IF NOT EXISTS archive.bi_versions_backup_20260418 AS SELECT * FROM public.bi_versions;
  CREATE TABLE IF NOT EXISTS archive.bi_interview_sessions_backup_20260418 AS SELECT * FROM public.bi_interview_sessions;
  CREATE TABLE IF NOT EXISTS archive.contact_bi_data_backup_20260418 AS SELECT * FROM public.contact_bi_data;
  CREATE TABLE IF NOT EXISTS archive.contact_bi_history_backup_20260418 AS SELECT * FROM public.contact_bi_history;

  SELECT count(*) INTO r_bi FROM archive.business_interviews_backup_20260418;
  SELECT count(*) INTO r_ai FROM archive.bi_ai_outputs_backup_20260418;
  SELECT count(*) INTO r_ver FROM archive.bi_versions_backup_20260418;
  SELECT count(*) INTO r_ses FROM archive.bi_interview_sessions_backup_20260418;
  SELECT count(*) INTO r_cbi FROM archive.contact_bi_data_backup_20260418;
  SELECT count(*) INTO r_hist FROM archive.contact_bi_history_backup_20260418;

  RAISE NOTICE 'Archived: business_interviews=%, bi_ai_outputs=%, bi_versions=%, bi_interview_sessions=%, contact_bi_data=%, contact_bi_history=%',
    r_bi, r_ai, r_ver, r_ses, r_cbi, r_hist;
END $$;

-- ============ NEW TABLE contact_bi ============
CREATE TABLE public.contact_bi (
  contact_id uuid PRIMARY KEY REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary text,
  filled_by_ai boolean NOT NULL DEFAULT false,
  last_filled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_bi_tenant ON public.contact_bi(tenant_id);
CREATE INDEX idx_contact_bi_answers_gin ON public.contact_bi USING GIN(answers);

ALTER TABLE public.contact_bi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_contact_bi" ON public.contact_bi
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_insert_contact_bi" ON public.contact_bi
  FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_update_contact_bi" ON public.contact_bi
  FOR UPDATE USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY "tenant_delete_contact_bi" ON public.contact_bi
  FOR DELETE USING (tenant_id = public.get_current_tenant_id());

CREATE TRIGGER trg_contact_bi_updated_at
  BEFORE UPDATE ON public.contact_bi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MIGRATE ai_summary FROM OLD ============
INSERT INTO public.contact_bi (contact_id, tenant_id, answers, ai_summary, filled_by_ai, last_filled_at, updated_at)
SELECT DISTINCT ON (bi.contact_id)
  bi.contact_id,
  bi.tenant_id,
  '{}'::jsonb,
  COALESCE(
    (SELECT ao.summary::text FROM archive.bi_ai_outputs_backup_20260418 ao WHERE ao.business_interview_id = bi.id ORDER BY ao.created_at DESC NULLS LAST LIMIT 1),
    NULL
  ),
  true,
  bi.updated_at,
  COALESCE(bi.updated_at, now())
FROM archive.business_interviews_backup_20260418 bi
JOIN public.contacts c ON c.id = bi.contact_id
ORDER BY bi.contact_id, bi.updated_at DESC NULLS LAST
ON CONFLICT (contact_id) DO NOTHING;

-- ============ DROP OLD TABLES ============
DROP TABLE IF EXISTS public.contact_bi_history CASCADE;
DROP TABLE IF EXISTS public.bi_versions CASCADE;
DROP TABLE IF EXISTS public.bi_ai_outputs CASCADE;
DROP TABLE IF EXISTS public.bi_interview_sessions CASCADE;
DROP TABLE IF EXISTS public.business_interviews CASCADE;
DROP TABLE IF EXISTS public.contact_bi_data CASCADE;

-- ROLLBACK:
-- CREATE TABLE public.business_interviews AS SELECT * FROM archive.business_interviews_backup_20260418;
-- CREATE TABLE public.bi_ai_outputs AS SELECT * FROM archive.bi_ai_outputs_backup_20260418;
-- CREATE TABLE public.bi_versions AS SELECT * FROM archive.bi_versions_backup_20260418;
-- CREATE TABLE public.bi_interview_sessions AS SELECT * FROM archive.bi_interview_sessions_backup_20260418;
-- CREATE TABLE public.contact_bi_data AS SELECT * FROM archive.contact_bi_data_backup_20260418;
-- CREATE TABLE public.contact_bi_history AS SELECT * FROM archive.contact_bi_history_backup_20260418;
-- DROP TABLE public.contact_bi;