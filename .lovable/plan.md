
# Ostatnia iteracja: DnD sortowanie, Auto-assign, Raport PDF, Szablony projektow

## Co zostanie zbudowane

### 1. Drag-and-drop sortowanie zadań (Faza 6.1)
Reorderowanie zadań w widoku listy projektu oraz subtasków w TaskDetailSheet za pomocą @dnd-kit (już zainstalowany). Po przeciągnięciu -- batch update `sort_order` w bazie.

### 2. Auto-assign (Faza 4.3)
Nowa kolumna `auto_assign_mode` w tabeli `projects` + trigger DB na INSERT tasks. Gdy projekt ma włączony auto-assign, nowe zadanie jest automatycznie przypisywane do członka zespołu z najmniejszą liczbą aktywnych zadań. UI: przełącznik w ProjectOverviewTab.

### 3. Raport projektu z eksportem PDF (Faza 5.3)
Przycisk "Eksportuj PDF" w nagłówku ProjectDetail. Raport zawiera: dane projektu, postęp zadań, kamienie milowe, budżet czasu vs rzeczywisty, listę ryzyk (overdue, brak przypisania). Generowany przez jspdf (już zainstalowany).

### 4. Szablony projektów -- UI zarządzania (Faza 3.4)
Interfejs tworzenia szablonów (nazwa + lista predefiniowanych sekcji/zadań zapisana w `template_data` JSONB -- kolumna już istnieje). Opcja "Utwórz z szablonu" w dialogu tworzenia projektu.

---

## Szczegóły techniczne

### Krok 1: Migracja bazy danych

Jedna migracja:
- Kolumna `auto_assign_mode` (TEXT, nullable) w tabeli `projects` -- wartości: `round_robin`, `load_balance`, lub NULL (wyłączony)
- Trigger `auto_assign_new_task` na INSERT do `tasks`: jeśli `project_id` jest ustawiony i projekt ma `auto_assign_mode`, przypisz `owner_id` do członka projektu z najmniejszą liczbą pending/in_progress zadań

### Krok 2: Drag-and-drop sortowanie

**Nowy hook: `useTaskReorder.ts`**
- Funkcja `reorderTasks(taskIds: string[])` -- batch update `sort_order` w tabeli `tasks`
- Optymistyczna aktualizacja w React Query cache

**Nowy komponent: `SortableTaskItem.tsx`**
- Wrapper wokół `TaskRow` z `useSortable` z @dnd-kit/sortable
- Obsługa stylu drag overlay

**Modyfikacja `ProjectTasksTab.tsx`:**
- Owinięcie listy zadań w sekcjach w `DndContext` + `SortableContext`
- Po zdarzeniu `onDragEnd` -- wywołanie `reorderTasks` z nową kolejnością
- Sortowalne sekcje (zmiana `sort_order` sekcji)

**Modyfikacja `TaskDetailSheet.tsx`:**
- Subtaski owiniete w DndContext dla zmiany kolejności

### Krok 3: Auto-assign UI

**Modyfikacja `ProjectOverviewTab.tsx`:**
- Nowa sekcja "Auto-assign" w karcie "Szczegóły"
- Switch (włącz/wyłącz) + Select trybu (Round-robin / Load-balance)
- Wywołanie `updateProject` z `auto_assign_mode`

**Modyfikacja `useProjects.ts`:**
- Dodanie `auto_assign_mode` do `ProjectCreateSchema`

### Krok 4: Raport PDF

**Nowy komponent: `ProjectReportExport.tsx`**
- Przycisk "Eksportuj PDF"
- Pobiera dane: projekt, zadania, kamienie milowe, czas (time entries)
- Generuje PDF z jspdf + jspdf-autotable:
  - Nagłówek z nazwą projektu i statusem
  - Podsumowanie: liczba zadań, postęp, budżet czasu
  - Tabela kamieni milowych
  - Tabela zadań (tytuł, status, priorytet, termin, czas)
  - Sekcja ryzyk: overdue tasks, zadania bez przypisania

**Modyfikacja `ProjectDetail.tsx`:**
- Przycisk eksportu w nagłówku (obok DropdownMenu)

### Krok 5: Szablony projektów

**Nowy hook: `useProjectTemplates.ts`**
- CRUD na `project_templates` z `template_data` (JSONB)
- Struktura template_data: `{ sections: [{ name, color, tasks: [{ title, priority, description }] }] }`
- Funkcja `createProjectFromTemplate` -- tworzy projekt + sekcje + zadania

**Nowy komponent: `ProjectTemplateManager.tsx`**
- Lista istniejących szablonów
- Dialog tworzenia/edycji szablonu (nazwa + definiowanie sekcji i zadań)
- Przycisk usuwania szablonu

**Modyfikacja dialogu tworzenia projektu:**
- Opcjonalny Select "Utwórz z szablonu" -- po wyborze szablonu, automatyczne generowanie struktury

## Nowe zależności npm
- `@dnd-kit/sortable` -- potrzebne do SortableContext (core już zainstalowany, ale sortable nie)

## Pliki do utworzenia (5)
1. `src/hooks/useTaskReorder.ts`
2. `src/hooks/useProjectTemplates.ts`
3. `src/components/tasks/SortableTaskItem.tsx`
4. `src/components/projects/ProjectReportExport.tsx`
5. `src/components/projects/ProjectTemplateManager.tsx`

## Pliki do modyfikacji (5)
1. `src/components/projects/ProjectTasksTab.tsx` -- DnD context dla zadań i sekcji
2. `src/components/tasks/TaskDetailSheet.tsx` -- DnD dla subtasków
3. `src/components/projects/ProjectOverviewTab.tsx` -- sekcja Auto-assign
4. `src/pages/ProjectDetail.tsx` -- przycisk eksportu PDF
5. `src/hooks/useProjects.ts` -- auto_assign_mode w schemacie

## Kolejność implementacji
1. Migracja DB (auto_assign_mode + trigger)
2. Drag-and-drop (hook + SortableTaskItem + integracja w ProjectTasksTab i TaskDetailSheet)
3. Auto-assign UI (ProjectOverviewTab + useProjects)
4. Raport PDF (ProjectReportExport + integracja w ProjectDetail)
5. Szablony (useProjectTemplates + ProjectTemplateManager + integracja w dialogu tworzenia)
