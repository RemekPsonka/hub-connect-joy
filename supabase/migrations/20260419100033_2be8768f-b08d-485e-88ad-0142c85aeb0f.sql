-- Sprint 19a — ai_usage_log RLS fix
-- Problem: INSERT policy WITH CHECK (true) TO anon → każdy anon może wstrzyknąć fake koszty.

-- 1. ARCHIWIZACJA aktualnych policy (audyt)
CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.policies_ai_usage_log_snapshot_20260419 AS
  SELECT * FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ai_usage_log';

-- 2. Drop ALL existing INSERT policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_usage_log'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_usage_log', pol.policyname);
  END LOOP;
END $$;

-- 3. Re-create — tylko authenticated (z gate tenant_id) i service_role
CREATE POLICY ai_usage_log_insert_auth ON public.ai_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY ai_usage_log_insert_service ON public.ai_usage_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 4. RLS enable (bezpieczne no-op jeśli już)
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- ROLLBACK:
-- SELECT policyname, cmd, qual, with_check, roles FROM archive.policies_ai_usage_log_snapshot_20260419;
-- … i odtwórz CREATE POLICY ręcznie.