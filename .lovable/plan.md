
# Natychmiastowe odswiezanie widoku po zmianach

## Problem
Po zmianie nazwy projektu lub terminu (`due_date`) widok workspace nie aktualizuje sie, poniewaz:
1. `useUpdateProject` invaliduje tylko `['projects']` i `['project', id]`, ale NIE `['workspace-schedule']` -- a workspace wlasnie z tego query czyta dane.
2. Query `useWorkspaceSchedule` nie pobiera `due_date` ani `start_date` w joinie -- nawet po odswiezeniu, termin nie bylby widoczny.

## Zmiany

### 1. `src/hooks/useWorkspace.ts` -- dodanie `due_date` do selecta
Linia 15: zmiana joina z:
```
project:projects(id, name, color, description, status)
```
na:
```
project:projects(id, name, color, description, status, due_date, start_date)
```
Dzieki temu dane terminu beda dostepne w widoku workspace.

### 2. `src/hooks/useProjects.ts` -- invalidacja `workspace-schedule`
W `useUpdateProject`, w callbacku `onSuccess` (linia 158-161), dodanie:
```
queryClient.invalidateQueries({ queryKey: ['workspace-schedule'] });
```
Dzieki temu kazda zmiana projektu (nazwa, termin, status) natychmiast odswieza widok workspace.

### Podsumowanie
Dwie male zmiany w dwoch plikach -- zadnych zmian w komponentach UI, bo one juz poprawnie renderuja dane z query.
