-- Sprint 19b mini — kasacja crona sovra-weekly-report
-- User: "na razie nie używam" → unschedule + funkcja do kasacji
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE command LIKE '%sovra-weekly-report%' LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;
-- ROLLBACK:
-- SELECT cron.schedule('sovra-weekly-report-mon-7utc', '0 7 * * 1', $$
--   SELECT net.http_post(
--     url := 'https://smuaroosnsrqfjsbpxpa.supabase.co/functions/v1/sovra-weekly-report',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON_KEY>'),
--     body := '{"trigger": "cron"}'::jsonb
--   );
-- $$);