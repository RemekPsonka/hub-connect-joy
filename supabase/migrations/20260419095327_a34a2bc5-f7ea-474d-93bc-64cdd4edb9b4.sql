CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.policies_tasks_snapshot_20260419 AS
  SELECT * FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'tasks';