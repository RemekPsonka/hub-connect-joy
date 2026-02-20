

# Filtrowanie zadań na stronie Projekty/Zadania do "tylko moje"

## Problem
Strona `/tasks` (moduł Projekty/Zadania) pokazuje zadania **wszystkich użytkowników**, co jest nieprawidłowe. Ten moduł jest przeznaczony do pracy indywidualnej -- użytkownik powinien widzieć wyłącznie swoje zadania (te, których jest właścicielem lub do których jest przypisany).

Lejek sprzedaży (SPRZEDAŻ) to osobny moduł zespołowy -- tam widoczność wszystkich zadań z filtrowaniem pozostaje bez zmian.

## Rozwiązanie

### Plik: `src/pages/Tasks.tsx`

1. Zaimportować `useCurrentDirector` z `@/hooks/useDirectors`
2. Pobrać `directorId` zalogowanego użytkownika
3. Przefiltrować pobrane zadania klient-side (jak w `MyTasks.tsx`), aby pokazywać tylko te, gdzie:
   - `owner_id === directorId` (użytkownik jest właścicielem), **LUB**
   - `assigned_to === directorId` (użytkownik jest przypisany)
4. Zaktualizować `pendingCount` aby też liczył tylko zadania użytkownika

### Szczegóły techniczne

Dodanie `useMemo` do filtrowania tasków po stronie klienta (analogicznie do logiki w `MyTasks.tsx`):

```typescript
const { data: currentDirector } = useCurrentDirector();
const directorId = currentDirector?.id;

const myTasks = useMemo(() => {
  if (!directorId) return [];
  return tasks.filter(t => t.owner_id === directorId || t.assigned_to === directorId);
}, [tasks, directorId]);
```

Następnie przekazanie `myTasks` zamiast `tasks` do wszystkich widoków (list, table, kanban, calendar, team).

Alternatywnie: użycie server-side filtrów `ownerId` / `assignedTo` w `useTasks` -- ale to wymaga filtra OR na dwa pola, co jest trudniejsze z Supabase SDK. Filtr klient-side jest prostszy i spójny z podejściem w `MyTasks.tsx`.

### Pliki do zmiany:
- **`src/pages/Tasks.tsx`** -- dodanie importu `useCurrentDirector`, `useMemo`, filtrowanie tasków do "tylko moje"

