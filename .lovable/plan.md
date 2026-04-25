## Problem

W karcie kontaktu w `/sgu/odprawa` opiekun jest pokazany jako "👤 —" dla wszystkich 144 kontaktów teamu. Pre-flight DB potwierdza: `deal_team_contacts.assigned_to IS NULL` w 144/144 rekordach team SGU. Render działa (kod już czyta `dtc.assigned_director?.full_name`), ale pole nigdy nie jest ustawiane — bo nigdzie w UI Odprawy/Kanban/Klienci nie ma sposobu żeby je przypisać dla kontaktu typu lead/prospect (jest tylko w `PromoteDialog` przy promocji do klienta).

Skutek: gdy klikasz "Spotkanie umówione" / "Handshake" / dowolne `Co dalej?` — system nie wie czyje to spotkanie. Audyt decyzji w `meeting_decisions` traci atrybucję per-director.

## Co zrobimy

**1. Inline picker opiekuna w nagłówku karty (`SGUOdprawa.tsx`)**

Zamiast statycznego `<User /> {ownerName}` — komponent klikalny:

- Brak opiekuna → przycisk-link "Przypisz opiekuna" (akcent kolorowy, żeby kłuł w oczy że jest pusto).
- Jest opiekun → "👤 Anna Nowak" klikalne, hover otwiera popover z listą directorów teamu + "Bez opiekuna".
- Po wyborze: `UPDATE deal_team_contacts SET assigned_to = X WHERE id = dtc.id`, invalidate `['deal_team_contact_for_agenda']`.

Reużycie istniejącej infry: `useTeamDirectors(teamId)` (już naprawiony w poprzednim sprincie, zwraca 3 directorów teamu).

**2. Smart default dla `Co dalej?` templates**

W `NextStepDialog` `defaultAssigneeId` jest brane z `dtc.assigned_to`. Gdy NULL — dropdown wykonawcy startuje pusty i user musi wybrać. Po fixie #1 gdy opiekun ustawiony → dropdown auto-fill na opiekuna (już działa, ale zacznie być widoczne).

**3. Bonus: badge ostrzegawczy gdy brak opiekuna**

W `AgendaList` (lewa lista) — przy kontaktach bez opiekuna mała szara kropka/ikonka "?". Daje sygnał na liście że jest dziura w atrybucji. Opcjonalnie — powiedz czy chcesz, czy zostawić tylko #1+#2.

## Czego NIE robimy

- **Brak migracji DB** — kolumna `assigned_to` istnieje, FK do `directors.id` istnieje, RLS na `directors` działa po poprzednim sprincie.
- **Brak masowego back-fillu** — Remek sam ustawi opiekunów manualnie przez nowy picker. Auto-przypisanie "do tego kto ostatnio robił touchpoint" byłoby zgadywaniem.
- **Brak zmian w Kanban / Klienci** — tam już jest `PromoteDialog` z assignee. Możemy w osobnym sprincie ujednolicić, ale teraz fokus na Odprawę.

## Pliki dotknięte

- `src/pages/sgu/SGUOdprawa.tsx` — header karty: zamiana statycznego `ownerName` na komponent `<OwnerInlinePicker>`.
- `src/components/sgu/odprawa/OwnerInlinePicker.tsx` (NEW) — Popover z listą directorów + mutacja UPDATE + toast.
- `src/components/sgu/odprawa/AgendaList.tsx` — opcjonalnie: ikonka "brak opiekuna" obok kontaktu (do potwierdzenia w odpowiedzi).

## Acceptance

1. Wejdź na `/sgu/odprawa`, wybierz Janusza Urbańca → header pokazuje "Przypisz opiekuna" (bo `assigned_to` NULL).
2. Klik → popover, lista 3 directorów teamu (Remek + 2 inne).
3. Wybierz dyrektora → toast "Opiekun przypisany", header zmienia się na "👤 Imię Nazwisko".
4. Reload strony — opiekun zachowany.
5. Klik "+ Inne zadanie" w `Co dalej?` → dropdown "Wykonawca" auto-wybrany na opiekuna.
6. W `meeting_decisions` audit — kolejne decyzje (push/handshake) niosą prawidłowe `created_by` (już działa) + atrybucja przez `assigned_to` na `deal_team_contacts`.

## Pytanie do potwierdzenia

Czy dorzucamy bonus #3 (ikonka "brak opiekuna" w lewej liście agendy)? Tak / Nie. Domyślnie zrobię tylko #1+#2.
