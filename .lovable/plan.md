## Problem
`useSguStageTransition` tworzy zadania bez `assigned_to` i `assigned_to_user_id`. Zakładka „Moje" w `/sgu/zadania` filtruje po `assigned_to_user_id = auth.uid()` → nowe taski tam nie wpadają.

## Rozwiązanie
W `src/hooks/useSguStageTransition.ts` przy INSERT do `tasks`:

1. Pobierz właściciela kontaktu z `deal_team_contacts.assigned_to` dla danego `teamContactId`.
2. Jeśli null → fallback na directora klikającego użytkownika.
3. Zmapuj `directors.id` → `directors.user_id` (potrzebne do `assigned_to_user_id`).
4. Dodaj do INSERT:
   - `assigned_to: <director.id właściciela>`
   - `assigned_to_user_id: <user_id właściciela>`

## Edge case
Asystentka klikająca na odprawie tworzy task → trafi do dyrektora (właściciela kontaktu), nie do asystentki. Zgodnie z Twoją decyzją.

## Bez zmian
- `owner_id` zostaje = director.id klikającego (audyt kto utworzył).
- `due_date` nadal null (Twoja decyzja „bez terminu").
- Stare zadania (już istniejące, bez `assigned_to_user_id`) nie zostaną tknięte. Jeśli chcesz, mogę dorzucić jednorazowy backfill UPDATE, ale to osobna decyzja.

## Plik
- `src/hooks/useSguStageTransition.ts` — ~10 linii w sekcji „3) create next task".
