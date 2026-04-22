

# Regen `types.ts` z live Supabase — execute

## Plik ruszony
- **Tylko** `src/integrations/supabase/types.ts` (nadpisanie outputem generatora).

## Kroki wykonania (default mode)

1. **Backup obecnego pliku** → `/tmp/types.before.ts` (do diff-a).
2. **Introspekcja live schematu** dla tabel docelowych — `psql` na live DB:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_schema='public'
     AND table_name IN ('meeting_decisions','meeting_questions')
   ORDER BY table_name, ordinal_position;
   ```
   Wynik = source of truth do walidacji.
3. **Sanity check vs Twoja lista pól** (przed regenem):
   - Dla każdej Twojej kolumny sprawdzam obecność + typ + nullability w live DB.
   - **Jeśli brakuje którejkolwiek** z Twoich kolumn (`tenant_id`, `decision`, `ask_count`, `is_active`, `last_asked_at`, …) → **STOP**, nie odpalam generatora, raportuję rozjazd:
     ```
     MISMATCH:
       meeting_decisions: brak kolumny X (typ oczekiwany Y)
       meeting_questions: ...
     ```
   - Jeśli live ma **extra** kolumny — kontynuuję, pokażę je w diff.
4. **Regen przez Supabase Management API** (CLI w sandboxie nie ma `SUPABASE_ACCESS_TOKEN`, więc idę REST-em):
   ```bash
   curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     "https://api.supabase.com/v1/projects/smuaroosnsrqfjsbpxpa/types/typescript?included_schemas=public" \
     -o /tmp/types.after.ts
   ```
   Sprawdzam: rozmiar > 0, zaczyna się od `export type Json =`, zawiera `meeting_decisions:` i `meeting_questions:`.
   Fallback gdy brak `SUPABASE_ACCESS_TOKEN`: `npx supabase gen types typescript --project-id smuaroosnsrqfjsbpxpa --schema public` (jeśli też padnie → STOP, raportuję, NIE rekonstruuję ręcznie).
5. **Diff przed nadpisaniem** — `diff /tmp/types.before.ts /tmp/types.after.ts`:
   - Oczekuję: tylko nowe klucze `meeting_decisions` + `meeting_questions` w `Database['public']['Tables']`.
   - **Jeśli inne tabele zmieniają kształt** (Row/Insert/Update/Relationships pozostałych tabel) → **STOP**, raportuję pełną listę zmian, nie nadpisuję.
6. **Nadpisanie** `src/integrations/supabase/types.ts` outputem z `/tmp/types.after.ts`.
7. **Walidacja**: `npx tsc --noEmit` — exit 0 wymagany. Jeśli ≠ 0 → pokazuję pełny output, nie zostawiam zepsutego pliku.

## Co dostaniesz w odpowiedzi po execute

1. **Diff** ograniczony do nowych kluczy `Tables.meeting_decisions` + `Tables.meeting_questions` (Row/Insert/Update/Relationships) + potwierdzenie „reszta nietknięta".
2. **Output `npx tsc --noEmit`** (exit code + ewentualne błędy).
3. **Commit info**: w Lovable nie odpalam `git` — zmiana w pliku jest commitowana automatycznie przez platformę po nadpisaniu. Zamiast hash-a podam: nazwę pliku + bytes before/after + listę zmienionych linii.

## STOP conditions (nic nie nadpisuję jeśli)
- Live DB nie ma którejś z Twoich kolumn → mismatch report.
- Generator zwrócił pusty / niepełny plik (brak nagłówka `export type Json` lub brak oczekiwanych tabel).
- Diff pokazuje zmiany w innych tabelach niż dwie docelowe.
- `npx tsc --noEmit` exit ≠ 0 → rollback z `/tmp/types.before.ts`.

## Poza zakresem (bez zmian)
- Bez nowej migracji SQL.
- Bez nowych hooków.
- Bez `src/types/dealTeam.ts`.
- Bez komponentów.

