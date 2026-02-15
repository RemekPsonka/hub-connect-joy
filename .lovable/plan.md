
# Otwieranie zadan w oknie (dialog) zamiast nawigacji

## Problem
Klikniecie w zadanie w sekcji "Zadania" w workspace powoduje nawigacje do `/tasks?taskId=...`, co opuszcza glowny ekran workspace.

## Rozwiazanie
Zamiast `navigate()`, klikniecie w zadanie otworzy `TaskDetailSheet` (boczny panel Asana-style) bezposrednio w workspace -- dokladnie tak, jak dziala to na karcie kontaktu.

## Zmiany

### `src/components/workspace/WorkspaceTimeBlock.tsx`
Jedyny plik do zmiany:

1. Import `TaskDetailSheet` i `TaskModal` oraz typ `TaskWithDetails`
2. W komponencie `ProjectTasksList` dodanie stanu:
   - `selectedTask` (wybrany task do podgladu)
   - `isDetailOpen` (czy panel jest otwarty)
   - `isEditMode` / `isModalOpen` (do edycji z poziomu panelu)
3. Zamiana `onClick={() => navigate(...)}` na `onClick` ustawiajacy `selectedTask` i otwierajacy `TaskDetailSheet`
4. Renderowanie `TaskDetailSheet` i `TaskModal` wewnatrz komponentu -- panel boczny otwiera sie jako overlay, uzytkownik nie opuszcza workspace

### Wzorzec (identyczny jak w ContactTasksTab)
```text
const [selectedTask, setSelectedTask] = useState(null);
const [isDetailOpen, setIsDetailOpen] = useState(false);

// onClick na wierszu zadania:
setSelectedTask(task);
setIsDetailOpen(true);

// renderowanie:
<TaskDetailSheet open={isDetailOpen} onOpenChange={setIsDetailOpen} task={selectedTask} onEdit={...} />
```

Zadania dane z `useProjectTasks` juz zawieraja pelne relacje (cross_tasks, task_contacts, assignee, owner, task_categories), wiec `TaskDetailSheet` otrzyma kompletny obiekt `TaskWithDetails` bez dodatkowych zapytan.
