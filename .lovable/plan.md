

# Naprawa otwierania widoku zadania z panelu kontaktu

## Problem
Klikniecie zadania (np. "Umowic spotkanie") w panelu szczegalow kontaktu (`DealContactDetailSheet`) nie otwiera prawidlowego widoku zadania (Asana-style `TaskDetailSheet`). Prawdopodobna przyczyna: `TaskDetailSheet` (Sheet/panel boczny) jest renderowany wewnatrz `DealContactDetailSheet` (Dialog/modal) i otwiera sie "za" nim z powodu konfliktow z-index miedzy dwoma komponentami Radix Dialog.

## Rozwiazanie
Zmienic logike tak, aby klikniecie zadania w panelu kontaktu **zamykalo panel kontaktu** i dopiero otwieralo `TaskDetailSheet`. Alternatywnie, wyniesc `TaskDetailSheet` na poziom rodzica (KanbanBoard / ClientsTab), aby nie byl zagniezdony wewnatrz Dialogu.

## Zmiany w plikach

### 1. `src/components/deals-team/DealContactDetailSheet.tsx`
- Usunac renderowanie `TaskDetailSheet` z wnetrza tego komponentu (linie 713-723)
- Zamiast otwierac `TaskDetailSheet` wewnatrz dialogu, wywolac callback do rodzica z wybranym zadaniem
- Dodac nowy prop `onTaskOpen?: (task: TaskWithDetails) => void`
- W `onClick` na `UnifiedTaskRow` (linie 350-353, 371-374): zamiast `setTaskDetailOpen(true)`, wywolac `onTaskOpen(task)` i zamknac dialog kontaktu

### 2. `src/components/deals-team/KanbanBoard.tsx`
- Dodac stan `selectedTask` i `taskDetailOpen`
- Przekazac `onTaskOpen` do `DealContactDetailSheet`
- Renderowac `TaskDetailSheet` na poziomie `KanbanBoard` (poza Dialogiem kontaktu)
- Import `TaskDetailSheet` i `TaskModal`

### 3. `src/components/deals-team/ClientsTab.tsx`
- Analogicznie jak KanbanBoard: dodac stan `selectedTask` i `taskDetailOpen`
- Przekazac `onTaskOpen` do `DealContactDetailSheet`
- Renderowac `TaskDetailSheet` na poziomie `ClientsTab`

## Szczegoly techniczne

Przeplyw po zmianie:
1. Uzytkownik klika kontakt w kanban -> otwiera sie `DealContactDetailSheet` (Dialog)
2. Uzytkownik klika zadanie w sekcji "Zadania" -> Dialog kontaktu sie zamyka
3. `TaskDetailSheet` (Sheet boczny w stylu Asana) otwiera sie na poziomie glownym
4. Po zamknieciu TaskDetailSheet, uzytkownik wraca do widoku kanban

Kluczowa zmiana: `TaskDetailSheet` nie jest juz zagniezdony wewnatrz `Dialog`, wiec nie ma konfliktu z-index.
