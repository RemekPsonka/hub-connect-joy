
User mówi "na razie nie używam" → odpowiada na moje pytanie z poprzedniej tury o `sovra-weekly-report` (cron pon 7:00 UTC).

## Plan

Mini-sprint: kasacja `sovra-weekly-report`.

1. `supabase--read_query`: `SELECT jobid, jobname, schedule, command FROM cron.job WHERE command LIKE '%sovra-weekly-report%';` — żeby mieć dokładny `jobid`/`jobname` do unschedule.
2. Migracja `supabase/migrations/<ts>_drop_sovra_weekly_report_cron.sql`:
   ```sql
   DO $$
   DECLARE r RECORD;
   BEGIN
     FOR r IN SELECT jobid FROM cron.job WHERE command LIKE '%sovra-weekly-report%' LOOP
       PERFORM cron.unschedule(r.jobid);
     END LOOP;
   END $$;
   -- ROLLBACK: SELECT cron.schedule('sovra-weekly-report', '0 7 * * 1', $$ ... $$);
   ```
3. `code--exec rm -rf supabase/functions/sovra-weekly-report`.
4. `code--line_replace` w `supabase/config.toml` — usuń sekcję `[functions.sovra-weekly-report]` (linie z `verify_jwt = false`).
5. `supabase--delete_edge_functions` z `["sovra-weekly-report"]`.
6. Raport: cron unscheduled, folder usunięty, sekcja config.toml usunięta, edge function deleted.

Bez DROP danych. Bez zmian w innych funkcjach (`sovra-reminder-trigger` zostaje — nie pytałem o nią, user nic nie powiedział).
