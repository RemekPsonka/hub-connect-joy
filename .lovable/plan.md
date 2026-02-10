

# Natychmiastowe odswiezanie danych po dodaniu

## Problem

Po dodaniu zadania (lub innego elementu) na stronie projektu, kontaktu lub konsultacji dane nie pojawiaja sie od razu -- trzeba recznie odswiezyc strone. Przyczyna: mutacje (`useCreateTask`, `useCreateCrossTask`, `useUpdateTask`, bulk operations) nie invaliduja kluczy cache takich jak `project-tasks` i `consultation-tasks`.

## Rozwiazanie

Dodac brakujace `invalidateQueries` do wszystkich mutacji w `src/hooks/useTasks.ts`, aby po kazdej zmianie zadania odswiezaly sie rowniez widoki powiazane z projektami i konsultacjami.

## Zmiany w pliku `src/hooks/useTasks.ts`

Dodac do `onSuccess` nastepujacych hookow:

### 1. `useCreateTask` (linia ~470)
Dodac:
- `queryClient.invalidateQueries({ queryKey: ['project-tasks'] })`
- `queryClient.invalidateQueries({ queryKey: ['consultation-tasks'] })`

### 2. `useCreateCrossTask` (linia ~536)
Dodac:
- `queryClient.invalidateQueries({ queryKey: ['project-tasks'] })`

### 3. `useUpdateTask` (linia ~561)
Dodac:
- `queryClient.invalidateQueries({ queryKey: ['project-tasks'] })`
- `queryClient.invalidateQueries({ queryKey: ['consultation-tasks'] })`

### 4. `useDeleteTask` (linia ~619)
Dodac:
- `queryClient.invalidateQueries({ queryKey: ['project-tasks'] })`
- `queryClient.invalidateQueries({ queryKey: ['consultation-tasks'] })`

### 5. `useBulkUpdateTasks` (linia ~644)
Dodac:
- `queryClient.invalidateQueries({ queryKey: ['project-tasks'] })`

### 6. `useCreateSubtask` (linia ~700)
Juz ma `project-tasks` -- OK.

Lacznie: 1 plik, ~8 dodanych linii. Zadne nowe komponenty, zadne zmiany w edge functions.

