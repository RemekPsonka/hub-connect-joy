

# Ujednolicenie statusow zadan miedzy widokami

## Problem

Istnieja dwie rozne konwencje nazewnictwa statusow:

```text
Baza danych:     todo  |  in_progress  |  completed  |  cancelled
deals-team UI:   pending  |  in_progress  |  done  |  cancelled
TaskDetailSheet: pending  |  in_progress  |  completed
```

Warstwa mapowania (`fromTaskStatus`/`toTaskStatus`) w `useDealsTeamAssignments.ts` tlumczy miedzy nimi, ale to prowadzi do bledow gdy TaskDetailSheet otwierany z MyTeamTasksView probuje aktualizowac status wartosciami, ktorych baza nie rozpoznaje.

## Rozwiazanie

Ujednolicenie do wartosci bazodanowych (`todo`, `in_progress`, `completed`, `cancelled`) we wszystkich komponentach. Warstwa mapowania zostaje usunieta - etykiety wyswietlane sa przez konfiguracje UI.

## Zmiany w plikach

### 1. `src/hooks/useDealsTeamAssignments.ts`
- Usuniecie funkcji `toTaskStatus` i `fromTaskStatus`
- Usuniecie wszystkich wywolan `.map(... fromTaskStatus ...)` w hookach `useContactAssignments`, `useMyTeamAssignments`, `useDealContactAllTasks`
- W `useUpdateAssignment`: zamiana `toTaskStatus(params.status)` na bezposrednie uzycie `params.status`, zamiana warunku `completed_at` z `params.status === 'done'` na `params.status === 'completed'`

### 2. `src/components/deals-team/MyTeamTasksView.tsx`
- Zamiana `statusConfig` z kluczami `pending/done` na `todo/completed`:
  - `pending` -> `todo` (label: "Do zrobienia")
  - `done` -> `todo` zostaje, `done` -> `completed`
- Zamiana `statusCycle` z `['pending', 'in_progress', 'done']` na `['todo', 'in_progress', 'completed']`
- Wszystkie porownania `task.status === 'done'` -> `task.status === 'completed'`
- Usuniecie mapowania w `selectedTask` (linia 458) - status przekazywany bez konwersji
- Warunek `overdue` - zamiana `!== 'done'` na `!== 'completed'`

### 3. `src/components/tasks/TaskStatusBadge.tsx`
- Dodanie obslugi statusu `todo` (ten sam styl co `pending`, label "Do zrobienia")
- Dodanie obslugi statusu `cancelled` (szary styl, label "Anulowane")
- Zachowanie `pending` jako alias (fallback) dla kompatybilnosci

### 4. `src/components/tasks/TaskActivityLog.tsx`
- Dodanie `todo: 'Do zrobienia'` i `cancelled: 'Anulowane'` do `statusLabels`

### 5. `src/components/deals-team/DealContactDetailSheet.tsx`
- Zamiana porownania statusow z `pending/done` na `todo/completed` w sekcji zadan (ikony statusu, cykliczne przelaczanie)

## Efekt
- Jeden zestaw wartosci statusow (`todo`, `in_progress`, `completed`, `cancelled`) uzyty wszedzie
- Brak warstwy tlumaczenia = brak bledow synchronizacji
- TaskDetailSheet otwarty z dowolnego widoku operuje na tych samych wartosciach co baza
- Pelna funkcjonalnosc zachowana: cykliczne przelaczanie, edycja, drag-and-drop, subtaski

