
# Ulepszenia systemu projektow i zadan

## 1. Edycja nazwy projektu (inline)

W naglowku `ProjectDetail.tsx` nazwa projektu bedzie klikalna i edytowalna inline (wzorzec identyczny jak edycja tytulu zadania w `TaskDetailSheet`). Klikniecie na nazwe zamienia ja w pole `Input`, a blur lub Enter zapisuje zmiane przez `useUpdateProject`.

### Pliki do zmiany:
- `src/pages/ProjectDetail.tsx` -- dodanie stanu `editingName`/`nameValue`, klikalna nazwa `h1`, Input przy edycji, zapis przez `updateProject.mutate`

---

## 2. Zalaczniki do zadan

Utworzenie tabeli `task_attachments` i storage bucket `task-attachments`, a nastepnie komponentu `TaskAttachments` wyswietlanego w panelu `TaskDetailSheet`.

### Migracja bazy danych:
- Nowa tabela `task_attachments` (id, task_id, tenant_id, file_name, file_url, file_type, file_size, uploaded_by, created_at)
- RLS: tenant isolation + wlasciciel/przypisany do zadania moze wstawiac/czytac
- Storage bucket `task-attachments` (publiczny do odczytu, z polityka uploadu dla zalogowanych)

### Nowe pliki:
- `src/hooks/useTaskAttachments.ts` -- hooki `useTaskAttachments(taskId)`, `useUploadTaskAttachment()`, `useDeleteTaskAttachment()`
- `src/components/tasks/TaskAttachments.tsx` -- komponent z lista plikow, przyciskiem upload, ikonami typow plikow (wzorzec z `ProjectFilesTab`)

### Pliki do zmiany:
- `src/components/tasks/TaskDetailSheet.tsx` -- dodanie `<TaskAttachments taskId={task.id} />` miedzy sekcja opisu a time tracker

---

## 3. Powiazanie kamieni milowych z zadaniami i projektem

Tabela `tasks` juz posiada kolumne `milestone_id` (FK do `project_milestones`). Brakuje:
- Wybor milestone w formularzu tworzenia/edycji zadania
- Wyswietlanie milestone w panelu szczegulow zadania
- Wyswietlanie zadan przypisanych do milestone w widoku kamieni milowych
- Pasek postepu milestone na podstawie statusow przypisanych zadan

### Pliki do zmiany:

**TaskModal.tsx** (formularz tworzenia/edycji):
- Dodanie stanu `milestoneId`
- Pobranie `useProjectMilestones(projectId)` -- wyswietlenie selectora milestone tylko gdy wybrany jest projekt
- Przekazanie `milestone_id` w `createTask` i `updateTask`

**TaskDetailSheet.tsx** (panel szczegulow):
- Dodanie wiersza MetaRow "Kamien milowy" z nazwa i ikona Diamond
- Klikniety milestone przenosi do zakladki kamieni milowych projektu

**ProjectMilestones.tsx** (widok kamieni milowych):
- Pobranie zadan projektu (`useProjectTasks`)
- Pod kazdym kamieniem milowym: lista przypisanych zadan (mini lista z UnifiedTaskRow compact)
- Pasek postepu (completed/total zadan) na kazdym milestone
- Mozliwosc dodania zadania bezposrednio do milestone (przycisk "+" przy kamieniu)

**useProjects.ts / useTasks.ts**:
- Upewnienie sie ze `milestone_id` jest przekazywany w `createTask` i `updateTask`

---

## Podsumowanie zmian

| Funkcja | Typ zmiany | Pliki |
|---------|-----------|-------|
| Edycja nazwy projektu | Kod UI | ProjectDetail.tsx |
| Zalaczniki do zadan | Migracja + Kod | Nowa tabela, bucket, hook, komponent, TaskDetailSheet |
| Milestone w zadaniach | Kod UI | TaskModal, TaskDetailSheet |
| Milestone z zadaniami | Kod UI | ProjectMilestones |
