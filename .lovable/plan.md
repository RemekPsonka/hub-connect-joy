

# Naprawa: brak zielonego badge po dodaniu zadania

## Problem
Po utworzeniu zadania z poziomu ContactTasksSheet, zielony badge aktywnego zadania nie pojawia sie na karcie kontaktu w Kanban. Przyczyna: hook `useActiveTaskContacts` uzywa query key `['active-task-contacts', teamId]`, ale funkcja `invalidateAllTaskQueries()` w `useTasks.ts` nie invaliduje tego klucza. Query ma 10-minutowy cache (`staleTime`), wiec badge nie odswiezy sie az do nastepnego wejscia na strone.

## Rozwiazanie

### Plik: `src/hooks/useTasks.ts`

Dodanie jednej linii do funkcji `invalidateAllTaskQueries()`:

```text
queryClient.invalidateQueries({ queryKey: ['active-task-contacts'] });
```

To spowoduje, ze po kazdej operacji na taskach (tworzenie, edycja, usuwanie) badge aktywnych zadan odswiezy sie natychmiast.

### Pliki do zmiany:
1. **`src/hooks/useTasks.ts`** — dodanie invalidacji `active-task-contacts` w `invalidateAllTaskQueries()`

