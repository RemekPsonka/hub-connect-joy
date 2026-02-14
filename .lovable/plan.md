
# Zamiana TaskModal na TaskDetailSheet w ContactTasksSheet

## Problem
Przycisk "Nowe zadanie" w panelu kontaktu (ContactTasksSheet) otwiera centralny dialog (`TaskModal`), zamiast uzywac bocznego panelu (`TaskDetailSheet`) - tego samego, ktory jest uzywany wszedzie indziej.

## Rozwiazanie
Zamiast otwierac `TaskModal`, po kliknieciu "Nowe zadanie" system:
1. Tworzy zadanie automatycznie (z domyslnym tytulem "Nowe zadanie") uzywajac `useCreateTask`
2. Zamyka `ContactTasksSheet`
3. Otwiera `TaskDetailSheet` z nowym zadaniem (po 150ms delay, aby uniknac kolizji animacji)

Uzytkownik od razu widzi pelny panel zadania w stylu Asana i moze edytowac tytul, opis, status itd. inline.

## Zmiany w pliku

### `src/components/deals-team/ContactTasksSheet.tsx`

1. Usunac import `TaskModal`
2. Usunac stan `taskModalOpen` i komponent `<TaskModal>` na dole
3. Dodac import `useCreateTask` z `@/hooks/useTasks`
4. Dodac import `toast` z `sonner`
5. W przycisku "Nowe zadanie" zamiast `setTaskModalOpen(true)`:
   - Wywolac `createTask.mutateAsync(...)` z domyslnymi danymi (tytul "Nowe zadanie", kontakt, dealTeamId)
   - Po sukcesie: zamknac ContactTasksSheet, po 150ms wywolac `onTaskOpen` z nowym zadaniem
   - Nowe zadanie od razu pojawi sie w `TaskDetailSheet` gdzie uzytkownik edytuje je inline

### Szczegoly techniczne

Nowa funkcja `handleCreateAndOpen`:
```text
async handleCreateAndOpen():
  1. createTask.mutateAsync({ task: { title: "Nowe zadanie", status: "todo" }, contactId, dealTeamId, dealTeamContactId })
  2. Pobrac pelne dane zadania (refetch tasks)
  3. onOpenChange(false) - zamknac ContactTasksSheet
  4. setTimeout(() => onTaskOpen(newTask), 150)
```

Poniewaz `useCreateTask` zwraca surowy rekord (bez relacji), a `TaskDetailSheet` potrzebuje `TaskWithDetails`, po utworzeniu zadania trzeba poczekac na refetch listy zadan i znalezc nowe zadanie po ID.
