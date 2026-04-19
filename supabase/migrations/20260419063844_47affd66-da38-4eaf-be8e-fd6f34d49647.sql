-- Sprint 18: Meetings + Consultations unified view (FE-only consolidation)

-- 1. Archive snapshots (read-only backups per project policy)
CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive.consultations_backup_20260419 AS
  SELECT * FROM public.consultations;

CREATE TABLE IF NOT EXISTS archive.group_meetings_backup_20260419 AS
  SELECT * FROM public.group_meetings;

CREATE TABLE IF NOT EXISTS archive.one_on_one_meetings_backup_20260419 AS
  SELECT * FROM public.one_on_one_meetings;

CREATE TABLE IF NOT EXISTS archive.meeting_participants_backup_20260419 AS
  SELECT * FROM public.meeting_participants;

-- 2. Unified view (UNION ALL of consultations + group_meetings)
CREATE OR REPLACE VIEW public.unified_meetings
WITH (security_invoker = true) AS
SELECT
  c.id,
  'consultation'::text AS type,
  c.tenant_id,
  c.scheduled_at,
  c.duration_minutes AS duration,
  c.location,
  c.notes,
  c.status::text AS status,
  c.contact_id AS contact_id_main,
  'consultations'::text AS source_table,
  c.created_at,
  c.updated_at
FROM public.consultations c
UNION ALL
SELECT
  g.id,
  'group'::text AS type,
  g.tenant_id,
  g.scheduled_at,
  g.duration_minutes AS duration,
  g.location,
  g.description AS notes,
  g.status::text AS status,
  NULL::uuid AS contact_id_main,
  'group_meetings'::text AS source_table,
  g.created_at,
  g.updated_at
FROM public.group_meetings g;

COMMENT ON VIEW public.unified_meetings IS
  'Sprint 18 bridge view: konsultacje + spotkania grupowe w jednym strumieniu. security_invoker=true → RLS z tabel źródłowych.';

-- ROLLBACK:
-- DROP VIEW IF EXISTS public.unified_meetings;
-- DROP TABLE IF EXISTS archive.consultations_backup_20260419;
-- DROP TABLE IF EXISTS archive.group_meetings_backup_20260419;
-- DROP TABLE IF EXISTS archive.one_on_one_meetings_backup_20260419;
-- DROP TABLE IF EXISTS archive.meeting_participants_backup_20260419;
