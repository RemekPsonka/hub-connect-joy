
# Pelna aktywacja panelu kontaktu w lejku sprzedazy

## Problem
Panel boczny kontaktu (DealContactDetailSheet) ma wszystkie sekcje wizualnie, ale nie dzialaja prawidlowo:

1. **Zadania nie sa widoczne** -- panel uzywa `useContactTasksWithCross` (szuka przez tabele `task_contacts`), ale zadania tworzone w lejku sa zapisywane z `deal_team_contact_id` na tabeli `tasks`. Te dwa systemy sa rozlaczone.
2. **Nowe zadania nie sa powiazane z lejkiem** -- TaskModal nie przekazuje `deal_team_id` ani `deal_team_contact_id`, wiec nowe zadania tworzone z panelu nie pojawiaja sie w widoku zadaniowym lejka.
3. **Historia aktywnosci dziala** -- uzywany hook `useContactActivityLog` poprawnie odpytuje `deal_team_activity_log`.
4. **Produkty/Deale dzialaja** -- `ClientProductsPanel` jest poprawnie podlaczony.

## Plan naprawy

### 1. Zunifikowane pobieranie zadan dla kontaktu w lejku

Stworze nowy hook `useDealContactTasks` w `src/hooks/useDealsTeamAssignments.ts` (lub rozszerze istniejacy), ktory pobiera zadania z **obu zrodel**:
- Zadania powiazane przez `deal_team_contact_id` (system lejkowy)
- Zadania powiazane przez `task_contacts` (system ogolny CRM)

Usunie duplikaty i zwroci zunifikowana liste.

### 2. Rozszerzenie TaskModal o parametry lejkowe

Dodanie nowych propsow do `TaskModal`:
- `dealTeamId?: string`
- `dealTeamContactId?: string`

Gdy te propsy sa podane, `useCreateTask` wstawi je do rekordu `tasks` przy tworzeniu, dzieki czemu zadanie bedzie widoczne zarowno w panelu kontaktu jak i w widoku "Zadania sprzedazy".

### 3. Rozszerzenie useCreateTask

Dodanie obslug pol `deal_team_id` i `deal_team_contact_id` w `useCreateTask` (hooks `useTasks.ts`), plus invalidacja kluczy `deal-team-assignments`.

### 4. Aktualizacja DealContactDetailSheet

- Zamiana `useContactTasksWithCross` na nowy zunifikowany hook
- Przekazanie `dealTeamId` i `dealTeamContactId` do `TaskModal`
- Dodanie invalidacji kluczy po operacjach na zadaniach

## Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/hooks/useTasks.ts` | Dodanie `deal_team_id`, `deal_team_contact_id` do interfejsu `useCreateTask`. Invalidacja kluczy `deal-team-assignments`. |
| `src/hooks/useDealsTeamAssignments.ts` | Nowy hook `useDealContactAllTasks` -- laczy zadania z `deal_team_contact_id` i `task_contacts` w jedna liste. |
| `src/components/tasks/TaskModal.tsx` | Nowe propsy `dealTeamId`, `dealTeamContactId`. Przekazanie ich do `useCreateTask`. |
| `src/components/deals-team/DealContactDetailSheet.tsx` | Uzycie nowego hooka do wyswietlania zadan. Przekazanie parametrow lejkowych do TaskModal. |

### Diagram przepywu danych

Po zmianach zadania beda widoczne w obu kontekstach:

```text
TaskModal (z panelu lejka)
  |
  v
tasks table
  |- deal_team_contact_id  --> widoczne w "Zadania sprzedazy"
  |- task_contacts (join)  --> widoczne w CRM / profil kontaktu
  |
  v
DealContactDetailSheet
  <- zunifikowany hook (oba zrodla)
```
