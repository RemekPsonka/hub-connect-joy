## Cel

Zachować historyczny `lost_at` przy ponownym oznaczeniu kontaktu jako utracony przez gałąź `dead/kill` w triggerze `apply_meeting_decision()`.

## Zmiana

Jedna mini-migracja `CREATE OR REPLACE FUNCTION public.apply_meeting_decision()` — kopia 1:1 aktualnej definicji, z jedyną poprawką w gałęzi `dead/kill`:

```diff
- lost_at = now(),
+ lost_at = COALESCE(lost_at, now()),
```

Reszta funkcji (gałęzie `go`, `postponed`, `push`, legacy `park`/`pivot`, blok zamykania `follow_up_task_id`) bez zmian. Brak zmian w plikach `src/`.

## Pliki

- `supabase/migrations/<timestamp>_apply_meeting_decision_lost_at_coalesce.sql` — `CREATE OR REPLACE FUNCTION` z rollbackiem (komentarz `-- ROLLBACK:` przywracający `lost_at = now()`).

## DONE WHEN

- Funkcja zredeployowana (CREATE OR REPLACE).
- INSERT do `meeting_decisions(decision_type='kill', ...)` na kontakcie który już ma `lost_at NOT NULL` → `lost_at` pozostaje niezmieniony.
- INSERT na kontakcie z `lost_at IS NULL` → `lost_at = now()`.
- Pozostałe pola gałęzi dead/kill (`is_lost`, `category='lost'`, `lost_reason`, `status='disqualified'`, `next_action_date/action=NULL`) działają bez regresji.
- Zero zmian w `src/`.
