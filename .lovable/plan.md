
# Naprawa flow zamykania zadan i cyklicznosci

## Zidentyfikowane problemy

### 1. Trigger `handle_recurring_task` tworzy zadania ze statusem 'pending'
Trigger bazodanowy tworzy nowe zadanie cykliczne ze statusem `'pending'`, ale caly system UI (kanban, listy, filtry) uzywa statusow: `todo`, `in_progress`, `completed`, `cancelled`. Zadanie ze statusem `pending` nie pojawia sie w zadnej kolumnie kanbana ani na liscie -- jest "niewidoczne".

**Naprawa:** Migracja SQL -- zmiana triggera `handle_recurring_task` aby tworzyl zadania ze statusem `'todo'` zamiast `'pending'`.

### 2. Po zakonczeniu zadania cyklicznego brak informacji o nowym zadaniu
Gdy uzytkownik zamyka zadanie cykliczne, panel szczegolów (TaskDetailSheet) zamyka sie natychmiast (`onOpenChange(false)`). Uzytkownik nie wie, ze system stworzyl nowe zadanie-kontynuacje z kolejnym terminem.

**Naprawa:** Po zakonczeniu zadania cyklicznego:
- Wyswietlic toast z informacja o nowym zadaniu i przyciskiem "Otworz nowe zadanie"
- Pobrac nowo utworzone zadanie (query po `source_task_id = task.id`) i umozliwic szybkie przejscie do niego

### 3. Nowe zadanie cykliczne nie dziedziczy powiazania z kontaktem
Trigger `handle_recurring_task` kopiuje pola zadania, ale NIE kopiuje wpisow z tabeli `task_contacts`. Nowe zadanie cykliczne traci powiazanie z kontaktem.

**Naprawa:** Rozszerzyc trigger aby kopiowal rowniez rekordy `task_contacts` ze starego zadania do nowego.

### 4. Sortowanie -- nowe zadanie z przyszlym terminem ladujena koncu
Domyslne sortowanie to `created_at DESC`, wiec nowe zadanie powinno byc na gorze. Ale w widoku MyTasks (grupowanie wg daty), zadanie z przyszlym terminem trafi do sekcji "Pozniej" co jest poprawne -- ale uzytkownik powinien zobaczyc powiadomienie/link.

**Brak zmiany sortowania** -- to jest poprawne zachowanie. Problem rozwiazuje punkt 2 (feedback o nowym zadaniu).

## Pliki do zmiany

### 1. Migracja SQL
- Zmiana triggera `handle_recurring_task`: status `'pending'` -> `'todo'`
- Dodanie kopiowania `task_contacts` do nowego zadania cyklicznego
- Naprawa istniejacych zadan ze statusem `'pending'` (UPDATE na `'todo'`)

```sql
-- Fix existing pending tasks
UPDATE tasks SET status = 'todo' WHERE status = 'pending';

-- Recreate trigger to use 'todo' and copy task_contacts
CREATE OR REPLACE FUNCTION handle_recurring_task() ...
  -- INSERT ... status = 'todo' (zamiast 'pending')
  -- + INSERT INTO task_contacts SELECT ... FROM task_contacts WHERE task_id = NEW.id
```

### 2. `src/components/tasks/TaskDetailSheet.tsx`
- Zmodyfikowac `handleComplete` i `handleStatusChange`:
  - Po ustawieniu statusu `completed`, jesli zadanie ma `recurrence_rule`, poczekac na invalidacje cache
  - Pobrac nowe zadanie cykliczne (query: `source_task_id = task.id, status = 'todo'`)
  - Wyswietlic toast z przyciskiem "Otworz nastepne zadanie" ktory otwiera nowe zadanie w panelu szczegolów
  - Nie zamykac panelu natychmiast -- dac uzytkownikowi chwile na zobaczenie potwierdzenia

### 3. `src/components/tasks/BulkTaskActions.tsx`
- Usunac status `'pending'` z opcji -- zastapic na `'todo'` (juz jest, ale upewnic sie ze nie ma niezgodnosci)

### 4. `src/hooks/useTasks.ts`
- Dodac helper hook `useNextRecurringTask(sourceTaskId)` do pobierania najnowszego zadania potomnego

## Szczegoly techniczne

### Zmieniony trigger (kluczowy fragment):
```sql
INSERT INTO public.tasks (..., status, ...)
VALUES (..., 'todo', ...);  -- bylo 'pending'

-- Kopiowanie kontaktow
INSERT INTO public.task_contacts (task_id, contact_id, role)
SELECT v_new_task_id, tc.contact_id, tc.role
FROM public.task_contacts tc
WHERE tc.task_id = NEW.id;
```

### Flow po zakonczeniu zadania cyklicznego:
```text
Uzytkownik klika "Zakoncz"
  -> updateTask(status: 'completed')
  -> Trigger DB tworzy nowe zadanie (status: 'todo', nowy due_date)
  -> invalidateQueries
  -> UI czeka 500ms, pobiera nowe zadanie (source_task_id = old.id)
  -> Toast: "Zadanie zakonczone. Nastepne: [tytul] - termin [data]" + przycisk "Otworz"
  -> Klikniecie "Otworz" -> otwiera TaskDetailSheet z nowym zadaniem
```
