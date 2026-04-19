
-- Sprint 19c-α A1.1: zabezpieczenie schematu archive przed PostgREST
REVOKE ALL ON SCHEMA archive FROM anon, authenticated, public;
REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM anon, authenticated, public;

-- Backup table is owned by postgres/service_role only
ALTER DEFAULT PRIVILEGES IN SCHEMA archive REVOKE ALL ON TABLES FROM anon, authenticated, public;

-- ROLLBACK:
-- GRANT USAGE ON SCHEMA archive TO authenticated;
