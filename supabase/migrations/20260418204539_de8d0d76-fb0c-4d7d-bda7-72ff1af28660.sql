-- ============================================================
-- Sprint 09 — Audit log unification
-- ============================================================

-- 0. Archive schema
CREATE SCHEMA IF NOT EXISTS archive;

-- 1. Archive all 7 source tables
CREATE TABLE IF NOT EXISTS archive.task_activity_log_backup_20260418 AS SELECT * FROM public.task_activity_log;
CREATE TABLE IF NOT EXISTS archive.task_workflow_history_backup_20260418 AS SELECT * FROM public.task_workflow_history;
CREATE TABLE IF NOT EXISTS archive.deal_team_activity_log_backup_20260418 AS SELECT * FROM public.deal_team_activity_log;
CREATE TABLE IF NOT EXISTS archive.deal_history_backup_20260418 AS SELECT * FROM public.deal_history;
CREATE TABLE IF NOT EXISTS archive.contact_activity_log_backup_20260418 AS SELECT * FROM public.contact_activity_log;
CREATE TABLE IF NOT EXISTS archive.contact_merge_history_backup_20260418 AS SELECT * FROM public.contact_merge_history;
CREATE TABLE IF NOT EXISTS archive.role_audit_log_backup_20260418 AS SELECT * FROM public.role_audit_log;

DO $$
DECLARE
  v_t int; v_tw int; v_dt int; v_dh int; v_c int; v_cm int; v_r int;
BEGIN
  SELECT COUNT(*) INTO v_t FROM archive.task_activity_log_backup_20260418;
  SELECT COUNT(*) INTO v_tw FROM archive.task_workflow_history_backup_20260418;
  SELECT COUNT(*) INTO v_dt FROM archive.deal_team_activity_log_backup_20260418;
  SELECT COUNT(*) INTO v_dh FROM archive.deal_history_backup_20260418;
  SELECT COUNT(*) INTO v_c FROM archive.contact_activity_log_backup_20260418;
  SELECT COUNT(*) INTO v_cm FROM archive.contact_merge_history_backup_20260418;
  SELECT COUNT(*) INTO v_r FROM archive.role_audit_log_backup_20260418;
  RAISE NOTICE 'Archived rows: task=%, task_workflow=%, deal_team=%, deal_history=%, contact=%, contact_merge=%, role=%',
    v_t, v_tw, v_dt, v_dh, v_c, v_cm, v_r;
END $$;

-- 2. Create partitioned audit_log
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  actor_id uuid,
  action text NOT NULL,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 3. Partitions
CREATE TABLE public.audit_log_pre_2026 PARTITION OF public.audit_log
  FOR VALUES FROM (MINVALUE) TO ('2026-01-01');

CREATE TABLE public.audit_log_2026_01 PARTITION OF public.audit_log FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE public.audit_log_2026_02 PARTITION OF public.audit_log FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE public.audit_log_2026_03 PARTITION OF public.audit_log FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE public.audit_log_2026_04 PARTITION OF public.audit_log FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE public.audit_log_2026_05 PARTITION OF public.audit_log FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE public.audit_log_2026_06 PARTITION OF public.audit_log FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE public.audit_log_2026_07 PARTITION OF public.audit_log FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE public.audit_log_2026_08 PARTITION OF public.audit_log FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE public.audit_log_2026_09 PARTITION OF public.audit_log FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE public.audit_log_2026_10 PARTITION OF public.audit_log FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE public.audit_log_2026_11 PARTITION OF public.audit_log FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE public.audit_log_2026_12 PARTITION OF public.audit_log FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- 4. Indexes
CREATE INDEX idx_audit_log_entity ON public.audit_log (tenant_id, entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_log_actor ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX idx_audit_log_tenant_created ON public.audit_log (tenant_id, created_at DESC);

-- 5. RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_tenant"
  ON public.audit_log FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "audit_log_insert_tenant"
  ON public.audit_log FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Service role bypass (for edge functions using service key)
CREATE POLICY "audit_log_service_role_all"
  ON public.audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Backfill — task_activity_log
INSERT INTO public.audit_log (id, tenant_id, entity_type, entity_id, actor_id, action, diff, metadata, created_at)
SELECT
  id,
  tenant_id,
  'task',
  task_id,
  actor_id,
  COALESCE(action, 'update'),
  jsonb_build_object('old', old_value, 'new', new_value),
  COALESCE(metadata, '{}'::jsonb),
  COALESCE(created_at, now())
FROM public.task_activity_log
WHERE created_at IS NOT NULL;

-- 7. Backfill — deal_team_activity_log
INSERT INTO public.audit_log (id, tenant_id, entity_type, entity_id, actor_id, action, diff, metadata, created_at)
SELECT
  id,
  team_id,
  'deal_team',
  COALESCE(team_contact_id, team_id),
  actor_id,
  COALESCE(action, 'update'),
  jsonb_build_object('old', COALESCE(old_value, '{}'::jsonb), 'new', COALESCE(new_value, '{}'::jsonb)),
  jsonb_build_object(
    'team_id', team_id,
    'team_contact_id', team_contact_id,
    'prospect_id', prospect_id,
    'note', note
  ),
  COALESCE(created_at, now())
FROM public.deal_team_activity_log
WHERE created_at IS NOT NULL
  AND team_id IS NOT NULL;

-- 8. Backfill — deal_history
INSERT INTO public.audit_log (id, tenant_id, entity_type, entity_id, actor_id, action, diff, metadata, created_at)
SELECT
  id,
  tenant_id,
  'deal',
  deal_id,
  changed_by,
  'update',
  jsonb_build_object('field', field_name, 'old', old_value, 'new', new_value),
  jsonb_build_object('old_stage_id', old_stage_id, 'new_stage_id', new_stage_id),
  COALESCE(created_at, now())
FROM public.deal_history
WHERE created_at IS NOT NULL;

-- 9. Backfill — contact_activity_log (no actor in source)
INSERT INTO public.audit_log (id, tenant_id, entity_type, entity_id, actor_id, action, diff, metadata, created_at)
SELECT
  id,
  tenant_id,
  'contact',
  contact_id,
  NULL,
  COALESCE(activity_type, 'note'),
  '{}'::jsonb,
  COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('description', description),
  COALESCE(created_at, now())
FROM public.contact_activity_log
WHERE created_at IS NOT NULL;

-- 10. Backfill — contact_merge_history
INSERT INTO public.audit_log (id, tenant_id, entity_type, entity_id, actor_id, action, diff, metadata, created_at)
SELECT
  id,
  tenant_id,
  'contact',
  primary_contact_id,
  NULL,
  'merge',
  '{}'::jsonb,
  jsonb_build_object(
    'merged_contact_data', merged_contact_data,
    'ai_integrated_fields', ai_integrated_fields,
    'merge_source', merge_source
  ),
  COALESCE(created_at, now())
FROM public.contact_merge_history
WHERE created_at IS NOT NULL
  AND primary_contact_id IS NOT NULL;

-- 11. Backfill — role_audit_log
INSERT INTO public.audit_log (id, tenant_id, entity_type, entity_id, actor_id, action, diff, metadata, created_at)
SELECT
  id,
  tenant_id,
  'role',
  target_user_id,
  changed_by_user_id,
  action,
  '{}'::jsonb,
  jsonb_build_object(
    'old_role', old_role,
    'new_role', new_role,
    'details', COALESCE(details, '{}'::jsonb)
  ),
  COALESCE(created_at, now())
FROM public.role_audit_log
WHERE created_at IS NOT NULL;

-- 12. RPC helper to insert audit entries
CREATE OR REPLACE FUNCTION public.log_entity_change(
  p_entity_type text,
  p_entity_id uuid,
  p_actor_id uuid,
  p_action text,
  p_diff jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_tenant uuid;
BEGIN
  v_tenant := public.get_current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'log_entity_change: no tenant context';
  END IF;
  INSERT INTO public.audit_log (tenant_id, entity_type, entity_id, actor_id, action, diff, metadata)
  VALUES (v_tenant, p_entity_type, p_entity_id, p_actor_id, p_action, COALESCE(p_diff, '{}'::jsonb), COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- 13. Drop legacy tables
DROP TABLE IF EXISTS public.task_activity_log CASCADE;
DROP TABLE IF EXISTS public.task_workflow_history CASCADE;
DROP TABLE IF EXISTS public.deal_team_activity_log CASCADE;
DROP TABLE IF EXISTS public.deal_history CASCADE;
DROP TABLE IF EXISTS public.contact_activity_log CASCADE;
DROP TABLE IF EXISTS public.contact_merge_history CASCADE;
DROP TABLE IF EXISTS public.role_audit_log CASCADE;

-- 14. Sanity
DO $$
DECLARE v_total int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.audit_log;
  RAISE NOTICE 'audit_log total rows: %', v_total;
END $$;

-- ROLLBACK:
-- DROP TABLE public.audit_log CASCADE;
-- DROP FUNCTION public.log_entity_change(text, uuid, uuid, text, jsonb, jsonb);
-- CREATE TABLE public.task_activity_log AS SELECT * FROM archive.task_activity_log_backup_20260418;
-- CREATE TABLE public.task_workflow_history AS SELECT * FROM archive.task_workflow_history_backup_20260418;
-- CREATE TABLE public.deal_team_activity_log AS SELECT * FROM archive.deal_team_activity_log_backup_20260418;
-- CREATE TABLE public.deal_history AS SELECT * FROM archive.deal_history_backup_20260418;
-- CREATE TABLE public.contact_activity_log AS SELECT * FROM archive.contact_activity_log_backup_20260418;
-- CREATE TABLE public.contact_merge_history AS SELECT * FROM archive.contact_merge_history_backup_20260418;
-- CREATE TABLE public.role_audit_log AS SELECT * FROM archive.role_audit_log_backup_20260418;
