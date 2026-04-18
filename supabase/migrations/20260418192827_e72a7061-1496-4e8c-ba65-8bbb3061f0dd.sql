-- Sprint 01 — Security RLS
-- Data: 2026-04-18

-- 1. Archiwizacja aktualnych policies (do audytu)
CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.policies_snapshot_20260418 AS
  SELECT * FROM pg_policies WHERE schemaname = 'public';

-- 2. RLS + policies na bug_reports (per tenant + own dla INSERT)
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bug_reports_select_tenant ON public.bug_reports;
CREATE POLICY bug_reports_select_tenant ON public.bug_reports FOR SELECT
  USING (tenant_id = public.get_current_tenant_id() OR public.is_superadmin());

DROP POLICY IF EXISTS bug_reports_insert_own ON public.bug_reports;
CREATE POLICY bug_reports_insert_own ON public.bug_reports FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND (reporter_user_id = auth.uid() OR reporter_user_id IS NULL)
  );

DROP POLICY IF EXISTS bug_reports_update_tenant ON public.bug_reports;
CREATE POLICY bug_reports_update_tenant ON public.bug_reports FOR UPDATE
  USING (tenant_id = public.get_current_tenant_id() OR public.is_superadmin());

DROP POLICY IF EXISTS bug_reports_delete_superadmin ON public.bug_reports;
CREATE POLICY bug_reports_delete_superadmin ON public.bug_reports FOR DELETE
  USING (public.is_superadmin());

-- 3. error_logs — weryfikacja RLS + policies per tenant
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS error_logs_select_tenant ON public.error_logs;
CREATE POLICY error_logs_select_tenant ON public.error_logs FOR SELECT
  USING (tenant_id = public.get_current_tenant_id() OR tenant_id IS NULL OR public.is_superadmin());

DROP POLICY IF EXISTS error_logs_insert ON public.error_logs;
CREATE POLICY error_logs_insert ON public.error_logs FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR tenant_id IS NULL);

-- ROLLBACK:
-- DROP POLICY IF EXISTS bug_reports_select_tenant ON public.bug_reports;
-- DROP POLICY IF EXISTS bug_reports_insert_own ON public.bug_reports;
-- DROP POLICY IF EXISTS bug_reports_update_tenant ON public.bug_reports;
-- DROP POLICY IF EXISTS bug_reports_delete_superadmin ON public.bug_reports;
-- ALTER TABLE public.bug_reports DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS error_logs_select_tenant ON public.error_logs;
-- DROP POLICY IF EXISTS error_logs_insert ON public.error_logs;