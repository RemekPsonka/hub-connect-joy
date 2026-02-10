
# Interaktywne zadania w widoku projektu

## Problem

Zakladka "Zadania" w widoku projektu wyswietla zadania jako prosty, statyczny tekst. Brak mozliwosci:
- Klikniecia w zadanie, zeby otworzyc szczegoly (TaskDetailSheet)
- Zmiany statusu zadania (checkbox)
- Dodawania subtaskow
- Edycji zadania

## Rozwiazanie

Przebudowa `ProjectTasksTab` tak, aby uzywala tych samych komponentow co glowna strona Zadan (`Tasks.tsx`): `TaskDetailSheet` do podgladu/edycji, `TaskModal` do edycji, checkbox do zmiany statusu.

### Zmiany w `src/hooks/useProjects.ts` - useProjectTasks

Obecne zapytanie pobiera tylko `select('*')` z tabeli `tasks`. Trzeba rozszerzyc o joiny, zeby zwracac `TaskWithDetails`:

```
select(`*, task_contacts(contact_id, contacts(full_name, company)), cross_tasks(...)`)
```

Dzieki temu dane beda kompatybilne z `TaskDetailSheet` i `TasksList`.

### Zmiany w `src/components/projects/ProjectTasksTab.tsx`

1. Dodanie stanu na `selectedTask`, `isDetailOpen`, `isEditMode`
2. Kazdy wiersz zadania staje sie klikalny -- otwiera `TaskDetailSheet`
3. Dodanie checkboxa do szybkiej zmiany statusu (uzywajac `useUpdateTask`)
4. Renderowanie `TaskDetailSheet` (podglad, subtaski, usuwanie)
5. Edycja z `TaskDetailSheet` otwiera `TaskModal` w trybie edycji
6. Po zamknieciu sheetu/modalu dane odswiezaja sie automatycznie (dzieki juz dodanym invalidacjom `project-tasks`)

### Szczegoly techniczne

Nowy uklad wiersza zadania:
```text
[checkbox] Tytul zadania                    [status badge] [termin]
           Opis (1 linia)                   [priorytet]
```

Klikniecie w wiersz -> otwiera TaskDetailSheet (boczny panel z pelnym podgladem, subtaskami, edycja, usuwaniem).

Checkbox zmienia status miedzy `pending` i `completed`.

Modyfikowane pliki:
- `src/hooks/useProjects.ts` -- rozszerzenie selecta w useProjectTasks
- `src/components/projects/ProjectTasksTab.tsx` -- dodanie interaktywnosci
