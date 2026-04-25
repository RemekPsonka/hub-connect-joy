# CLEANUP-BUGS-01 — 5 bugów z TEST-FLOW-01

## Wnioski z pre-flight (read-only recon)

| Krok | Status pre-flight | Decyzja |
|------|-------------------|---------|
| A — SGU-CLIENTS-REDIRECT (#25) | `App.tsx:170` ma tylko `/sgu/klienci`, brak `/sgu/clients`. | **Fix** (1 linia + import) |
| B — NEXTSTEP-OWNER-FIX-02 (#21) | Potwierdzone 2 hity: `AddClientTaskDialog.tsx:75`, `ClientRenewalsTab.tsx:95`. Inne pliki używają `director.id` (czyste). | **Fix** w 2 plikach |
| C — AGENDA-NAME-SYNC (#22) | RPC `get_odprawa_agenda` JUŻ używa `COALESCE(co.name, c.company)` z poprawnym JOIN do `companies`. Robert Karczewski w DB: `companies.name='Rex-Bud'`, `contacts.company='Rex-Bud'` — **identyczne**. "Kaminski.org" widziałem dla **innego kontaktu** (Robert Kamiński, którego pomyłkowo kliknąłem w teście) — nie bug. | **SKIP/NO-OP** — false positive z TEST-FLOW-01 |
| D — KANBAN-CLIENT-FILTER (#24) | `useTeamContacts` w `useDealsTeamContacts.ts:46` ma `.neq('category', 'client')` (AUDIT-FIX-01). `SalesHeader.tsx:74` używa **tego samego hooka** bez parametru → counter "Klienci" zawsze 0, kolumna "Klient" w `UnifiedKanban` zawsze pusta. Decyzja UX: kanban to lejek sprzedaży, klienci żyją w `/sgu/klienci`. | **Fix** — usunięcie kolumny + KPI (wariant 1) |
| E — TASK-AUTOCOMPLETE (#23) | **ROOT CAUSE ZNALEZIONY** w triggerze `apply_meeting_decision` na `meeting_decisions`: ostatnie statement to bezwarunkowy `UPDATE tasks SET status='completed' WHERE deal_team_contact_id=NEW.deal_team_contact_id AND status<>'completed'`. **Każda** decyzja (push/pivot/park/kill) zamyka **wszystkie** otwarte zadania kontaktu — w tym świeżo utworzony task z `NextStepDialog` (który zaraz po INSERT wywołuje `useLogDecision` z `decision='push'`). Wyjaśnia age_sec≈1.75s w SQL. | **Fix migracja** (zwężenie warunku) |

## Plan fixów

### A — SGU-CLIENTS-REDIRECT

`src/App.tsx`:
- Sprawdzić czy `Navigate` jest już zaimportowany z `react-router-dom`; jeśli nie, dodać.
- Dorzucić bezpośrednio przed `<Route path="/sgu/klienci" ...>`:
  ```tsx
  <Route path="/sgu/clients" element={<Navigate to="/sgu/klienci" replace />} />
  ```

Smoke: nawigacja `/sgu/clients` → 302/replace → renderuje `/sgu/klienci` (lista klientów).

### B — NEXTSTEP-OWNER-FIX-02

W obu plikach przed INSERT do `tasks`:
```ts
const { data: directorRow, error: dirErr } = await supabase
  .from('directors').select('id').eq('user_id', userId).maybeSingle();
if (dirErr) throw dirErr;
if (!directorRow?.id) {
  toast.error('Nie znaleziono powiązanego dyrektora');
  return;
}
const ownerDirectorId = directorRow.id;
// ... insert: owner_id: ownerDirectorId
```

Pliki: `src/components/sgu/clients/AddClientTaskDialog.tsx` (~75), `src/components/sgu/clients/ClientRenewalsTab.tsx` (~95).

Smoke: po deploy → `/sgu/klienci` → karta klienta → "Dodaj zadanie" → SQL `SELECT owner_id FROM tasks WHERE id=<new>` zwraca `directors.id` (nie `auth.users.id`). FK `tasks_owner_id_fkey` przestaje rzucać 23503.

### C — AGENDA-NAME-SYNC

**SKIP** — żaden fix nie jest potrzebny. RPC działa poprawnie. False positive testera.
Akcja: zamknąć ticket #22 z notatką "Cannot reproduce — dane RPC zgadzają się z `companies.name`. Tester pomylił dwa kontakty 'Robert' w agendzie (Kamiński vs Karczewski)."

### D — KANBAN-CLIENT-FILTER-FIX

Dwa pliki:

**`src/components/sgu/sales/UnifiedKanban.tsx`** (~76):
- Usunąć z `COLUMNS` wpis `{ stage: 'client', ... }` — kanban ma 3 kolumny: Prospekt / Lead / Ofertowanie.
- W `deriveStage` (~82) zamienić `if (cat === 'client') return 'client';` na coś bezpiecznego (np. `return 'offering'` lub całkowite usunięcie — sprawdzę context, by nie złamać typów). Najpewniej zostawić enum `'client'` w typach (bo jest używany w `filter` propie i `SUBGROUP_CONFIG`), ale bez kolumny ekran nie pokaże client'ów.
- Usunąć `SUBGROUP_CONFIG.client` jeżeli nie jest referencjowany skądinąd; jeżeli jest — zostawić, kolumna i tak nie istnieje.

**`src/components/sgu/headers/SalesHeader.tsx`**:
- Usunąć item `client` z `items` (linia 118) — KPI cards mają być 4: Prospekci / Leady / Ofertowanie / Odłożone.
- Usunąć `clientList` (~87) i `expectedPortfolioPLN` (~89-98) jeżeli nieużywane gdzie indziej (do sprawdzenia w pliku).
- Usunąć `badgesByKey.client` (~110) i `CLIENT_STATUS_BADGES` jeżeli ich już nikt nie używa.
- Zaktualizować typ `onCardClick` (`'client'` może wyjść z union — jeżeli zostanie zostawione bezpiecznie OK).
- W `SGUPipelineRoute.tsx` typ `SalesFilter` może zostać; route `/sgu/sprzedaz?filter=client` po prostu nie będzie miał czego pokazać.

Smoke: `/sgu/sprzedaz` → 4 KPI cards (bez "Klienci"), kanban 3 kolumny. `/sgu/klienci` nadal działa jako jedyne źródło widoku klientów.

### E — TASK-AUTOCOMPLETE — fix migracja

Nowa migracja `supabase/migrations/<ts>_fix_apply_meeting_decision_task_completion.sql`:

```sql
-- BUG #23 fix: trigger apply_meeting_decision zamykał WSZYSTKIE otwarte zadania
-- kontaktu po każdej decyzji (push/pivot/park/kill), w tym świeżo utworzony
-- follow-up task z NextStepDialog → "Otwarte zadania (0)" zaraz po Stwórz.
--
-- Fix: zamykaj TYLKO konkretny follow_up_task_id (jeśli wskazany) i tylko
-- gdy decyzja semantycznie oznacza "task wykonany" (NIE 'push', który tworzy
-- nowy task — istniejące mają zostać otwarte).
--
-- ROLLBACK: przywrócić wcześniejsze ciało (bezwarunkowy UPDATE tasks WHERE
-- deal_team_contact_id=NEW.deal_team_contact_id AND status<>'completed').

CREATE OR REPLACE FUNCTION public.apply_meeting_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.decision_type = 'go' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date    = NEW.next_action_date,
           k1_meeting_done_at  = COALESCE(k1_meeting_done_at, now()),
           last_status_update  = now()
     WHERE id = NEW.deal_team_contact_id;
  ELSIF NEW.decision_type = 'postponed' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date    = NEW.postponed_until,
           k1_meeting_done_at  = COALESCE(k1_meeting_done_at, now()),
           last_status_update  = now()
     WHERE id = NEW.deal_team_contact_id;
  ELSIF NEW.decision_type = 'dead' THEN
    UPDATE public.deal_team_contacts
       SET is_lost            = true,
           lost_reason        = NEW.lost_reason,
           lost_at            = now(),
           category           = 'lost',
           deal_stage         = 'lost',
           status             = 'disqualified',
           next_action_date   = NULL,
           next_action        = NULL,
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;
  END IF;

  -- FIX #23: zamykamy tylko konkretny follow_up_task_id i tylko gdy
  -- decyzja oznacza zakończenie taska (NIE 'push' — push tworzy nowy task).
  IF NEW.follow_up_task_id IS NOT NULL
     AND NEW.decision_type IN ('go','dead')
  THEN
    UPDATE public.tasks
       SET status = 'completed', updated_at = now()
     WHERE id = NEW.follow_up_task_id
       AND status IS DISTINCT FROM 'completed';
  END IF;

  RETURN NEW;
END;
$function$;
```

Smoke E:
1. `/sgu/odprawa` → klik kontakt → "+ Inne zadanie" → wpisz tytuł → Wybierz wykonawcę → Zapisz.
2. SQL: `SELECT status, EXTRACT(epoch FROM (updated_at - created_at)) AS age_sec FROM tasks WHERE id=<new> ORDER BY created_at DESC LIMIT 1;`
3. EXPECTED: `status='open'`, `age_sec≈0`.
4. UI: panel "Otwarte zadania (1)" pokazuje nowy task.

Side-effect check: K1/K2/K3/K4 milestone clicks (które też wołają `useLogDecision` bez `followUpTaskId`) — dotychczasowe otwarte zadania mają **zostać otwarte** (już nie auto-zamykane). To zgodne z intencją: zaznaczenie milestone ≠ wykonanie wszystkich zadań.

## Commit (po wszystkich GREEN)

Pojedynczy commit:
```
chore(cleanup): CLEANUP-BUGS-01 — 4 bugi z TEST-FLOW-01 raport

A. SGU-CLIENTS-REDIRECT (#25): Navigate /sgu/clients → /sgu/klienci
B. NEXTSTEP-OWNER-FIX-02 (#21): AddClientTaskDialog + ClientRenewalsTab
   — owner_id mapping auth.uid() → directors.id (pattern z #20)
C. AGENDA-NAME-SYNC (#22): SKIP — false positive (tester pomylił
   Robert Kamiński vs Robert Karczewski w agendzie). Ticket zamknięty.
D. KANBAN-CLIENT-FILTER-FIX (#24): usunięcie kolumny "Klient" + KPI
   "Klienci" z /sgu/sprzedaz (klienci żyją w /sgu/klienci po AUDIT-FIX-01)
E. TASK-STATUS-AUTOCOMPLETE (#23): trigger apply_meeting_decision
   zamykał WSZYSTKIE otwarte zadania kontaktu po każdej decyzji.
   Fix: zamykaj tylko konkretny follow_up_task_id i tylko dla
   decision_type IN ('go','dead'). 'push' (NextStepDialog) tworzy
   nowy task — istniejące zostają otwarte.

Pre-flight + smoke per krok: w opisie PR.

Dotknięte pliki:
- src/App.tsx (A)
- src/components/sgu/clients/AddClientTaskDialog.tsx (B)
- src/components/sgu/clients/ClientRenewalsTab.tsx (B)
- src/components/sgu/sales/UnifiedKanban.tsx (D)
- src/components/sgu/headers/SalesHeader.tsx (D)
- supabase/migrations/<ts>_fix_apply_meeting_decision_task_completion.sql (E)
```

## Kolejność wykonania

1. A (najprostszy, izolowany) — fix + smoke nawigacji.
2. B (2 pliki, ten sam pattern) — fix obu, smoke per plik.
3. C — pominięte, notatka w commicie.
4. E (migracja + smoke) — przed D, bo D testuje się oczami a E dotyka triggera DB; nie chcę mieszać.
5. D (UI) — fix + smoke.
6. Commit jednym commitem po wszystkich GREEN.

Jeżeli E napotka komplikacje (np. inny komponent oczekuje, że zadania się auto-zamykają) — osobny commit dla A+B+D, ticket E do dalszego debugu.
