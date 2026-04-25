## Cel

Domknąć cleanup po HOTFIX-ODPRAWA-2BUGS — sierocy plik migracji `20260425104748_get_team_directors_rpc.sql` wisi w repo, ale RPC `get_team_directors` nigdy nie zaaplikowała się na bazie produkcyjnej (`pg_proc` pusty po pre-flight). Po decyzji option B (RLS + bezpośredni `.from('deal_team_members')` w hooku) ta funkcja jest niepotrzebna i nie wolno jej zaaplikować w przyszłości.

## Pre-flight (potwierdzone)

- `SELECT … FROM pg_proc WHERE proname='get_team_directors'` → `[]` (pusto, RPC nie istnieje na bazie).
- `rg "get_team_directors" src/` → 0 hitów (types.ts już zregenerowane, hook `useTeamDirectors` używa `.from()`).
- Plik sieroty `supabase/migrations/20260425104748_get_team_directors_rpc.sql` zawiera `CREATE OR REPLACE FUNCTION` z SECURITY DEFINER — gdyby ktoś kiedyś re-runnął migracje od zera, sierota by się zaaplikowała i wprowadziła martwy kod do bazy.

## Co zrobimy

**Jedna migracja idempotentna:**

`supabase/migrations/<ts>_drop_orphan_get_team_directors_rpc.sql`

```sql
BEGIN;
-- Sierota po HOTFIX-ODPRAWA-2BUGS: plan zakładał RPC z security definer,
-- ale migracja nigdy nie wykonała się na bazie produkcyjnej (pg_proc pusty).
-- Po pre-flight 2026-04-25 zdecydowano option B (RLS + .from()).
-- DROP IF EXISTS = idempotent: jeśli ktoś kiedyś zaaplikuje sierocy plik,
-- ten następnik go cofa. Czysty stan.
DROP FUNCTION IF EXISTS public.get_team_directors(uuid);
COMMIT;
```

Timestamp wyższy niż `20260425104748` — gwarantuje kolejność wykonania po sierocie przy ewentualnym re-runie.

## Czego NIE robimy

- **Nie usuwamy fizycznie pliku sieroty** `20260425104748_get_team_directors_rpc.sql` z repo — Supabase trzyma `schema_migrations` po nazwach plików; usunięcie może wywołać dirty-state przy następnej migracji. Bezpieczniej zostawić sierotę i dorzucić następnik DROP.
- **Brak zmian w kodzie aplikacyjnym** — hook `useTeamDirectors`, types.ts, RLS policies bez ruchu.
- **Brak archiwizacji** — to funkcja, nie tabela, brak danych do uratowania.

## Pliki dotknięte

- `supabase/migrations/<ts>_drop_orphan_get_team_directors_rpc.sql` (NEW, ~10 linii SQL).

## Acceptance

1. Migracja przechodzi bez błędu (DROP IF EXISTS = bezpieczny no-op gdy funkcji nie ma).
2. `SELECT … FROM pg_proc WHERE proname='get_team_directors'` → nadal `[]`.
3. `useTeamDirectors` w `/sgu/odprawa` nadal zwraca 3 directorów teamu (smoke: dropdown w `NextStepDialog` + `OwnerInlinePicker` ma listę).
4. Commit message: `chore(db): drop orphan get_team_directors RPC (post-AUDIT-FIX cleanup)`.
