

# Przypinanie i przesuwanie zadań między sekcjami

## Co zostanie zbudowane

1. **Dodawanie zadania bezpośrednio w sekcji** -- przycisk "+" przy nagłówku sekcji otwiera TaskModal z preselected `section_id`
2. **Przenoszenie zadania między sekcjami** -- menu kontekstowe (DropdownMenu) na każdym zadaniu z opcją "Przenieś do sekcji" i listą dostępnych sekcji + "Bez sekcji"
3. **Cross-section drag-and-drop** -- jeden globalny DndContext zamiast osobnych per sekcja, umożliwiający przeciąganie zadań między sekcjami i "Bez sekcji"
4. **Reorder sekcji** -- drag-and-drop na nagłówkach sekcji (sortowanie kolejności sekcji)

---

## Szczegoly techniczne

### Plik 1: `src/components/projects/ProjectTasksTab.tsx` (glowne zmiany)

**A) Globalny DndContext zamiast wielu osobnych:**
- Zamiana wielu `DndContext` (po jednym na sekcje) na jeden globalny `DndContext` obejmujacy wszystkie sekcje + "Bez sekcji"
- Kazda sekcja i "Bez sekcji" to osobny `SortableContext` z unikalnymi droppable areas
- W `onDragEnd`: jesli task zmienil sekcje -- update `section_id` + `sort_order`; jesli w tej samej -- tylko reorder

**B) Przycisk "+" dodawania zadania w sekcji:**
- Nowy state: `addingToSectionId` -- gdy ustawiony, TaskModal otwiera sie z `preselectedSectionId`
- Przycisk "+" obok badge z liczba zadan w naglowku sekcji
- TaskModal otrzyma nowy prop `preselectedSectionId`

**C) Menu kontekstowe na zadaniu -- "Przeniesc do sekcji":**
- Rozszerzenie `TaskRow` o prop `sections` i `onMoveToSection`
- Dodanie `DropdownMenu` z ikonka `MoreHorizontal` na hover, zawierajacego:
  - "Przeniesc do sekcji" -> submenu z lista sekcji + "Bez sekcji"
- Wywolanie `updateTask.mutate({ id, section_id })` przy wyborze

### Plik 2: `src/components/tasks/TaskModal.tsx`

- Nowy opcjonalny prop: `preselectedSectionId?: string`
- Nowy state `sectionId` inicjalizowany z `preselectedSectionId`
- Przy `createTask` -- przekazanie `section_id` w obiekcie task

### Plik 3: `src/components/tasks/SortableTaskItem.tsx`

- Dodanie `data` do `useSortable` z informacja o `sectionId` (potrzebne do identyfikacji zrodlowej sekcji przy cross-section drag)

### Plik 4: `src/hooks/useTasks.ts`

- Upewnienie sie, ze `useUpdateTask` akceptuje `section_id` w typie `TaskUpdate` (powinno dzialac przez istniejacy typ z Supabase)

---

## Kolejnosc implementacji

1. Modyfikacja `TaskRow` -- dodanie menu kontekstowego "Przeniesc do sekcji"
2. Modyfikacja `ProjectTasksTab` -- globalny DndContext + przycisk "+" w sekcjach
3. Modyfikacja `TaskModal` -- prop `preselectedSectionId`
4. Aktualizacja `SortableTaskItem` -- przekazanie danych sekcji

## Pliki do modyfikacji (3)
1. `src/components/projects/ProjectTasksTab.tsx`
2. `src/components/tasks/TaskModal.tsx`
3. `src/components/tasks/SortableTaskItem.tsx`

## Brak zmian w bazie danych
Kolumna `section_id` juz istnieje w tabeli `tasks`. Funkcja `handleAssignSection` jest juz zdefiniowana w `ProjectTasksTab` ale nie podlaczona do UI.

