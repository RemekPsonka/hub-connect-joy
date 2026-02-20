
# Rozszerzenie tworzenia zadan w lejku: przypisanie osoby + termin

## Problem
Zadania tworzone z poziomu lejka (ContactTasksSheet) nie maja:
1. Selektora "Przypisz do" -- nie mozna przypisac taska do innego czlonka zespolu
2. Daty terminu (due_date) -- nie mozna ustawic, do kiedy task ma byc zrobiony
3. Filtr "Moje" w MyTeamTasksView nie pokazuje taskow z `assigned_to = null`

## Rozwiazanie

### 1. `src/components/deals-team/ContactTasksSheet.tsx`

Dodac nad przyciskami szablonow kompaktowy wiersz z dwoma kontrolkami:

- **Select "Przypisz do:"** -- lista czlonkow zespolu z `useTeamMembers(teamId)`, domyslna wartosc: zalogowany dyrektor (`director?.id` z `useAuth`)
- **Date picker "Termin:"** -- maly Popover z kalendarzem (wzorzec z TaskModal), opcjonalny

Oba pola beda przekazywane do kazdego wywolania `createTask.mutateAsync()`:
- `assignedTo: selectedMemberId`
- `task.due_date: dueDate?.toISOString().split('T')[0]`

Dotyczy zarowno szablonow ("Umow spotkanie", "Zadzwon" itd.) jak i pola "+ Inne".

### 2. `src/components/deals-team/MyTeamTasksView.tsx`

Rozszerzenie filtra "Moje" (linia 131-132):

```text
Przed: a.assigned_to === director?.id
Po:    a.assigned_to === director?.id || (!a.assigned_to && a.owner_id === director?.id)
```

### Pliki do zmiany:
1. **`src/components/deals-team/ContactTasksSheet.tsx`** -- dodanie selektora osoby + date pickera + przekazywanie do createTask
2. **`src/components/deals-team/MyTeamTasksView.tsx`** -- rozszerzenie filtra "Moje" o owner_id

### Szczegoly techniczne

Nowe importy w ContactTasksSheet:
- `useTeamMembers` z `@/hooks/useDealsTeamMembers`
- `useAuth` z `@/contexts/AuthContext`
- `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` z `@/components/ui/select`
- `Popover, PopoverContent, PopoverTrigger` z `@/components/ui/popover`
- `Calendar` z `@/components/ui/calendar`
- `CalendarIcon` z `lucide-react`
- `cn` z `@/lib/utils`

Nowe stany:
- `assignTo` -- string, domyslnie `director?.id`
- `taskDueDate` -- `Date | undefined`

Uklad kontrolek: kompaktowy wiersz `flex gap-2` z dwoma malymi Select/Popover (rozmiar sm, h-7) umieszczony miedzy naglowkiem "Zadania" a przyciskami szablonow.
