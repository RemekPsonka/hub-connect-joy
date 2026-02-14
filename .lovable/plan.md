
# Rozbudowa widoku zadan w Zespole Deals + naprawa statusow

## Problemy do rozwiazania

1. **Widok zadan w deals-team (`MyTeamTasksView`) ma tylko jeden tryb** - grupowanie per kontakt. Brakuje: widoku listy plaskiej, kanban i kafelkow zespolowych.
2. **Statusy nie aktualizuja sie natychmiast** - `useUpdateAssignment` po zmianie statusu invaliduje tylko `['deal-team-assignments', teamContactId]`, ale NIE invaliduje `['deal-team-assignments-all', teamId]` - czyli lista glowna sie nie odswieza po zmianie.
3. **TaskDetailSheet uzywa `useUpdateTask`** (invaliduje `['tasks']`), ale dane w deals-team sa pobierane przez `useMyTeamAssignments` (`['deal-team-assignments-all']`) - wiec zmiany w panelu szczegolowym tez nie odswiezaja widoku.

## Plan zmian

### 1. Naprawa invalidacji cache (`useDealsTeamAssignments.ts`)

W `useUpdateAssignment.onSuccess` dodanie brakujacej invalidacji:
```
queryClient.invalidateQueries({ queryKey: ['deal-team-assignments-all'] });
```
To sprawi, ze kazda zmiana statusu natychmiast odswieza liste.

### 2. Dodanie przelacznika widokow do `MyTeamTasksView`

Dodanie stanu `viewMode: 'grouped' | 'list' | 'kanban' | 'team'` z przyciskami przelaczania (ToggleGroup) w toolbarze:
- **Grupowane** (obecny widok) - per kontakt z kartami
- **Lista** - plaska lista wszystkich zadan bez grupowania, uzywajaca `UnifiedTaskRow`
- **Kanban** - kolumny per status (todo, in_progress, completed, cancelled) z kartami zadan
- **Zespol** - kafelki per czlonek zespolu ze statystykami (jak `TasksTeamView`)

### 3. Widok listy plaskiej

Prosta iteracja po `filtered` z `UnifiedTaskRow` - bez grupowania per kontakt. Kazde zadanie wyswietla kontakt i firme w tytule.

### 4. Kanban wbudowany w deals-team

Mini-kanban z kolumnami per status. Karty zawieraja: tytul, kontakt, firme, priorytet, termin, avatar. Drag & drop miedzy kolumnami zmienia status.

### 5. Widok zespolowy wbudowany

Kafelki per czlonek zespolu z podsumowaniem: ile zadan, ile zakończonych, pasek postepu. Rozwijane listy zadan per status.

## Szczegoly techniczne

| Plik | Zmiana |
|---|---|
| `src/hooks/useDealsTeamAssignments.ts` | Dodanie invalidacji `['deal-team-assignments-all']` w `useUpdateAssignment` |
| `src/components/deals-team/MyTeamTasksView.tsx` | Dodanie stanu viewMode, przelacznika widokow, 3 nowych trybow renderowania (lista, kanban, zespol) |

Nie sa potrzebne zmiany w bazie danych.
