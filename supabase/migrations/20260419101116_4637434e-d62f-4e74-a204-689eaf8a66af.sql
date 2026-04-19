-- Sprint 19b — Przeniesienie deprecated_*_20260418 z public do archive
CREATE SCHEMA IF NOT EXISTS archive;

-- 1. Snapshot policy (audyt)
CREATE TABLE IF NOT EXISTS archive.policies_deprecated_prospects_snapshot_20260419 AS
  SELECT * FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'deprecated_meeting_prospects_20260418',
      'deprecated_deal_team_prospects_20260418'
    );

-- 2. Counts (log)
DO $$
DECLARE
  cnt_m bigint;
  cnt_d bigint;
BEGIN
  SELECT COUNT(*) INTO cnt_m FROM public.deprecated_meeting_prospects_20260418;
  SELECT COUNT(*) INTO cnt_d FROM public.deprecated_deal_team_prospects_20260418;
  RAISE NOTICE 'deprecated_meeting_prospects_20260418: % rows', cnt_m;
  RAISE NOTICE 'deprecated_deal_team_prospects_20260418: % rows', cnt_d;
END $$;

-- 3. SET SCHEMA
ALTER TABLE public.deprecated_meeting_prospects_20260418 SET SCHEMA archive;
ALTER TABLE public.deprecated_deal_team_prospects_20260418 SET SCHEMA archive;

-- ROLLBACK:
-- ALTER TABLE archive.deprecated_meeting_prospects_20260418 SET SCHEMA public;
-- ALTER TABLE archive.deprecated_deal_team_prospects_20260418 SET SCHEMA public;