

# Konsolidacja zadan: deal_team_assignments -> tasks

## Cel

Przepisac wszystkie hooki i komponenty, ktore czytaja/zapisuja do tabeli `deal_team_assignments`, aby korzystaly z glownej tabeli `tasks`. Dodac brakujace kolumny `deal_team_id` i `deal_team_contact_id` do tabeli `tasks`.

## Co sie zmieni

1. Zadania tworzone w module Deals beda widoczne w globalnym systemie zadan (/tasks)
2. Kanban, Kalendarz, komentarze, logi, powiadomienia -- dzialaja automatycznie dla zadan z Deals
3. Jedna tabela zamiast dwoch

## Plan techniczny

### Krok 1: Migracja bazy danych

Dodanie dwoch kolumn do tabeli `tasks`:

```text
tasks
  + deal_team_id          UUID (nullable, FK -> deal_teams.id, ON DELETE SET NULL)
  + deal_team_contact_id  UUID (nullable, FK -> deal_team_contacts.id, ON DELETE SET NULL)
```

Migracja istniejacego 1 rekordu z `deal_team_assignments` do `tasks`.

Aktualizacja polityk RLS na `tasks` -- dodanie warunku `is_deal_team_member` dla zadan z `deal_team_id`.

### Krok 2: Przepisanie useDealsTeamAssignments.ts

Caly plik przepisany na tabele `tasks`:

- `useContactAssignments` -> `SELECT * FROM tasks WHERE deal_team_contact_id = ?`
- `useCreateAssignment` -> `INSERT INTO tasks` z `deal_team_id`, `deal_team_contact_id`, `owner_id`
- `useUpdateAssignment` -> `UPDATE tasks SET status = ?` (mapowanie statusow: `pending` -> `todo`, `done` -> `completed`)
- `useMyTeamAssignments` -> `SELECT * FROM tasks WHERE deal_team_id = ?` z joinem na `deal_team_contacts` i `contacts`

Interfejs `DealTeamAssignment` zostanie zamapowany na pola z tabeli `tasks`.

### Krok 3: MyTeamTasksView.tsx

Drobne dostosowania mapowania pol (np. `team_contact_id` -> `deal_team_contact_id`, statusy `pending` -> `todo`).

### Krok 4: ProspectingConvertDialog.tsx

Zmiana `createAssignment.mutateAsync` aby uzywal nowego hooka (ktory juz zapisuje do `tasks`).

### Krok 5: WeeklyStatusForm.tsx

Juz zapisuje do `tasks` -- bez zmian. Potwierdze ze kolumny `deal_team_id` i `deal_team_contact_id` sa poprawnie ustawiane.

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Dodanie 2 kolumn + FK + migracja danych + RLS |
| `src/hooks/useDealsTeamAssignments.ts` | Pelne przepisanie na tabele `tasks` |
| `src/components/deals-team/MyTeamTasksView.tsx` | Dostosowanie mapowania pol i statusow |
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Bez zmian w logice (hook sie zmieni pod spodem) |

