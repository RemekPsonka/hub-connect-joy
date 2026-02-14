
# Naprawa natychmiastowej aktualizacji list po akcjach na zadaniach

## Problem
Po wykonaniu akcji (usuwanie, zmiana statusu, edycja) lista zadan nie aktualizuje sie natychmiast - trzeba odswiezyc strone. Przyczyna: brakujace invalidacje kluczy cache w hookach mutacji.

## Analiza

Istnieje wiele query keys uzywanych w roznych widokach:
- `['tasks']` - glowna lista zadan
- `['task', id]` - szczegoly jednego zadania
- `['project-tasks']` - zadania w projekcie
- `['pending-tasks-count']` - licznik
- `['contact-tasks-with-cross']` - zadania kontaktu
- `['dashboard-stats']` - statystyki
- `['consultation-tasks']` - zadania konsultacji
- `['deal-team-assignments']` - zadania w lejku per kontakt
- `['deal-team-assignments-all']` - wszystkie zadania lejka
- `['deal-contact-all-tasks']` - zadania kontaktu w deals
- `['subtasks']` - podzadania

Problem polega na tym, ze kazdy hook mutacji invaliduje INNY podzbiur tych kluczy. Na przyklad:

| Hook | Brakujace klucze |
|---|---|
| `useDeleteTask` | `deal-team-assignments`, `deal-team-assignments-all`, `deal-contact-all-tasks`, `task` |
| `useUpdateTask` | `deal-team-assignments-all` (dodane wczesniej, ale brak `subtasks`) |
| `useBulkUpdateTasks` | `deal-team-assignments`, `deal-team-assignments-all`, `deal-contact-all-tasks`, `contact-tasks-with-cross`, `consultation-tasks` |
| `useBulkDeleteTasks` | `project-tasks`, `deal-team-assignments`, `deal-team-assignments-all`, `deal-contact-all-tasks`, `contact-tasks-with-cross`, `consultation-tasks` |
| `useCreateSubtask` | `deal-team-assignments`, `deal-team-assignments-all` |

## Rozwiazanie

Stworze jedna wspolna funkcje `invalidateAllTaskQueries(queryClient)` i uzyje jej we WSZYSTKICH hookach mutacji zadan. Dzieki temu kazda akcja (tworzenie, edycja, usuwanie, bulk) odswiezy wszystkie widoki natychmiast.

### Plik: `src/hooks/useTasks.ts`

1. Dodanie na poczatku pliku funkcji:
```typescript
function invalidateAllTaskQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['task'] });
  queryClient.invalidateQueries({ queryKey: ['pending-tasks-count'] });
  queryClient.invalidateQueries({ queryKey: ['contact-tasks-with-cross'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
  queryClient.invalidateQueries({ queryKey: ['consultation-tasks'] });
  queryClient.invalidateQueries({ queryKey: ['deal-team-assignments'] });
  queryClient.invalidateQueries({ queryKey: ['deal-contact-all-tasks'] });
  queryClient.invalidateQueries({ queryKey: ['deal-team-assignments-all'] });
  queryClient.invalidateQueries({ queryKey: ['subtasks'] });
}
```

2. Zamiana w kazydm hooku mutacji (`useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useUpdateCrossTaskStatus`, `useDuplicateTask`, `useBulkUpdateTasks`, `useBulkDeleteTasks`, `useCreateSubtask`) blokow `onSuccess` na wywolanie `invalidateAllTaskQueries(queryClient)`.

### Efekt
- Kazda akcja na zadaniu (w dowolnym widoku) natychmiast odswieza WSZYSTKIE listy
- Brak potrzeby recznego odswiezania strony
- Jeden punkt zarzadzania kluczami cache - latwiejsze utrzymanie
