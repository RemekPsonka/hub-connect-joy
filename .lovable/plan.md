## Pre-flight wyniki

**A. Kolumny w `tasks`:** ✓ wszystkie 3 istnieją
- `assigned_to` (uuid) → directors.id
- `assigned_to_user_id` (uuid) → auth.users.id
- `owner_id` (uuid) → directors.id

**B. Funkcja `auto_assign_deal_team_task`:** ✓ istnieje, ale w **starej wersji** (kopiuje tylko `assigned_to` z DTC, NIE robi lookup `directors.user_id`).

**C. Triggery na `tasks`:** ❌ **ZERO triggerów**. Funkcja `auto_assign_deal_team_task` istnieje, ale nigdy nie była podpięta jako trigger. To wyjaśnia bug — żaden auto-assignment nie działał na poziomie DB.

**Stan danych:** 4 zadania DTC mają `assigned_to` ale brak `assigned_to_user_id` (na 10 wszystkich DTC tasks).

**Schemat zgodny z założeniami sprintu — kontynuujemy bez odchyleń.**

---

## Plan implementacji

### Krok 1 — Migracja DB (`supabase/migrations/<timestamp>_s1_task_assignee_user_id.sql`)

Jedna migracja, wszystko w transakcji, z `-- ROLLBACK:` na końcu:

1. `CREATE OR REPLACE FUNCTION auto_assign_deal_team_task()` — rozszerzona wersja (kopia `assigned_to` z DTC + lookup `directors.user_id` → `assigned_to_user_id`).
2. `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER auto_assign_deal_team_task_trigger BEFORE INSERT ON tasks` (podpinamy — wcześniej go nie było).
3. `CREATE OR REPLACE FUNCTION require_director_on_dtc_task()` — guard rzucający `RAISE EXCEPTION` gdy DTC bez `assigned_to`.
4. `CREATE TRIGGER require_director_on_dtc_task_trigger BEFORE INSERT ON tasks`.
5. **Backfill** historyczny: `UPDATE tasks ... FROM directors` dla 4 wierszy.
6. Komentarz weryfikacyjny z queries (oczekiwany wynik: 0).

`SECURITY DEFINER SET search_path = public` na obu funkcjach (zgodnie z linter rules).

### Krok 2 — Nowy hook `src/hooks/useRequireDirector.ts`

Dokładnie wg spec — React Query, `enabled: !!dtcId`, zwraca `{ hasDirector, dtcId }`. Nic więcej.

### Krok 3 — Wpięcie guard'u w 5 entry-pointów

Dla każdego pliku: zlokalizować handler tworzący task na DTC, dodać `useRequireDirector(dtcId)` na górze, na początku handlera sprawdzić `if (!hasDirector) { toast.error(...); return; }`. Action button w toast otwiera istniejący `OwnerInlinePicker` (lokalizuję wzorzec użycia w bazie kodu — jeśli w danym kontekście nie ma łatwego mount-pointu, akcja toast-u zostanie pominięta, sam komunikat wystarczy).

Pliki:
1. `src/components/sgu/odprawa/MilestoneActionStrip.tsx` — guard w `stamp()` i `stampSubStage()`.
2. `src/components/sgu/odprawa/NextStepDialog.tsx` — guard w handlerze submit.
3. `src/components/deals-team/ContactActionButtons.tsx` — guard w handlerach tworzących task.
4. `src/components/sgu/clients/AddClientTaskDialog.tsx` — guard w `createTask.mutationFn`.
5. `src/components/deals-team/MyTeamTasksView.tsx` — guard w handlerze ghost-task → real-task.

Bez zmian w props, bez nowych plików (poza hookiem).

### Krok 4 — Weryfikacja

- Po migracji: `SELECT count(*) FROM tasks WHERE deal_team_contact_id IS NOT NULL AND assigned_to IS NOT NULL AND assigned_to_user_id IS NULL AND status NOT IN ('completed','cancelled')` → oczekiwane 0.
- `npm run lint` po zmianach w 5 plikach + nowym hooku.
- Smoke w preview: utworzenie taska na kontakcie z dyrektorem → `assigned_to_user_id` wypełnione; na kontakcie bez dyrektora → toast + brak INSERT-u.

---

## Hard constraints (potwierdzenie)

- Tylko 1 nowy plik: `src/hooks/useRequireDirector.ts`.
- Modyfikacje wyłącznie w 5 wymienionych komponentach + 1 migracja.
- Bez nowych testów, bez refactoru, bez zmian UI/styling.
- Bez dotykania innych triggerów/funkcji DB.

## Out of scope

Pozostałe sprinty z audytu (S2–S14). Aktualnie tylko S1.