
# Dodanie nazwy firmy do kart zadan

## Problem
Na listach zadan i kartach Kanban widac tylko "Umowic spotkanie - Kowalski Krzysztof", ale brak informacji o firmie. Uzytkownik nie wie, czego dotyczy zadanie bez kontekstu firmy.

## Obecny stan
- Dane firmy (`company`) sa juz pobierane z bazy w hooku `useTasks` (join `task_contacts -> contacts(id, full_name, company)`)
- `TaskDetailSheet` juz wyswietla firme w sekcji "Powiazane kontakty" (linia 523-525)
- `UnifiedTaskRow` i `TasksKanban` pokazuja tylko `full_name` bez firmy

## Planowane zmiany

### 1. UnifiedTaskRow - dodanie firmy obok kontaktu

Zmiana formatu wyswietlania z:
```
Umowic spotkanie - Kowalski Krzysztof
```
na:
```
Umowic spotkanie - Kowalski Krzysztof · Ferox Energy Systems
```

Rozszerzenie props o `companyName?: string` i wyswietlenie go po kontakcie w szarym, mniejszym foncie.

### 2. TasksKanban - dodanie firmy w karcie

W tytule karty Kanban dodanie firmy po kontakcie:
```
Umowic spotkanie - Kowalski K. · Ferox Energy Systems
```

### 3. Przekazanie danych firmy we wszystkich miejscach

Pliki do aktualizacji (dodanie `companyName`):
- `src/components/tasks/TasksList.tsx` - `task.task_contacts?.[0]?.contacts?.company`
- `src/components/tasks/TasksTeamView.tsx` - jw.
- `src/components/deals-team/MyTeamTasksView.tsx` - jw.

## Szczegoly techniczne

| Plik | Zmiana |
|---|---|
| `src/components/tasks/UnifiedTaskRow.tsx` | Nowy prop `companyName`, wyswietlanie po contactName |
| `src/components/tasks/TasksList.tsx` | Przekazanie `companyName` |
| `src/components/tasks/TasksTeamView.tsx` | Przekazanie `companyName` |
| `src/components/tasks/TasksKanban.tsx` | Dodanie firmy obok kontaktu w karcie |
| `src/components/deals-team/MyTeamTasksView.tsx` | Przekazanie `companyName` |

Brak zmian w bazie danych - pole `company` jest juz pobierane w zapytaniach.
