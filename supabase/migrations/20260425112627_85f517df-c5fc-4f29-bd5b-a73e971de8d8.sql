BEGIN;
-- Sierota po HOTFIX-ODPRAWA-2BUGS: plan zakładał RPC z security definer,
-- ale migracja nigdy nie wykonała się na bazie produkcyjnej (pg_proc pusty).
-- Po pre-flight 2026-04-25 zdecydowano option B (RLS + .from()).
-- DROP IF EXISTS = idempotent: jeśli ktoś kiedyś zaaplikuje sierocy plik,
-- ten następnik go cofa. Czysty stan.
DROP FUNCTION IF EXISTS public.get_team_directors(uuid);
COMMIT;