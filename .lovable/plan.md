
# Wieloetapowy Plan Naprawy Systemu Zadan

## Podsumowanie Audytu

### Stan bazy danych
| Tabela | Rekordy | Status |
|--------|---------|--------|
| tasks | 39 | Glowna tabela - dziala |
| task_contacts | 10 | Uzywana - wielo-do-wielu zadanie-kontakt |
| cross_tasks | 1 | Uzywana - zadania polaczeniowe |
| task_activity_log | 14 | Uzywana - trigger automatyczny |
| task_notifications | 9 | Uzywana - powiadomienia |
| task_comments | 2 | Uzywana - komentarze |
| task_labels | 1 | Uzywana - etykiety |
| task_label_assignments | 1 | Uzywana - przypisania etykiet |
| task_sections | 1 | Uzywana - sekcje w projektach |
| task_time_entries | 1 | Uzywana - sledzenie czasu |
| task_dependencies | 0 | Pusta ale uzywana w kodzie (TaskDependencies.tsx) |
| task_categories | 0 | Pusta, ale uzywana w kodzie (TaskModal, KPI, Settings) |
| task_automation_rules | 0 | Pusta, uzywana w kodzie (AutomationRulesPanel) |
| task_custom_fields | 0 | Pusta, uzywana w kodzie (TaskCustomFields.tsx) |
| task_custom_field_values | 0 | Pusta, uzywana w kodzie |
| task_workflow_history | 0 | Pusta, uzywana w kodzie (SavedViewsDropdown) |
| saved_task_views | 0 | Pusta, uzywana w kodzie |

### Problemy znalezione w kodzie

1. **Status `pending` nadal w uzyciu** - domyslna wartosc w bazie to `'pending'`, a 1 zadanie ma ten status. W kodzie jest ~15 miejsc uzywajacych `pending` zamiast `todo`:
   - `useTasks.ts`: `usePendingTasksCount()` szuka `status = 'pending'`
   - `useTasks.ts`: `useCreateCrossTask` ustawia `status: 'pending'`
   - `useTasks.ts`: `useCreateSubtask` ustawia `status: 'pending'`
   - `useTasks.ts`: `useDuplicateTask` ustawia `status: 'pending'`
   - `TaskModal.tsx`: domyslny status = `'pending'`, reset do `'pending'`
   - `TasksKanban.tsx`: mapuje `pending` -> `todo` (warstwa kompatybilnosci)
   - `TasksTeamView.tsx`: mapuje `pending` -> `todo`
   - `TaskDetailSheet.tsx`: subtask toggle ustawia `'pending'`
   - `TeamTasksWidget.tsx` i `MyTasksWidget.tsx`: filtruja po `status: 'pending'`
   - `useConsultations.ts`: tworzy zadanie z `status: 'pending'`
   - `useDealsTeamAssignments.ts`: tworzy zadanie z `status: 'todo'` (OK)

2. **Stary widok ContactTasksTab** - uzywa starych komponentow (`TaskPriorityBadge`, `TaskStatusBadge`, `TaskTypeBadge`, `CrossTaskDetail`) zamiast zunifikowanego `UnifiedTaskRow` + `TaskDetailSheet`

3. **Stary widok MyTasks** - uzywa Checkbox + Card zamiast `UnifiedTaskRow`, nie korzysta z zunifikowanego widoku

4. **Komponenty do usuniecia/zastapienia**:
   - `TaskPriorityBadge.tsx` - zastapiony przez `PRIORITY_CONFIG` w `UnifiedTaskRow`
   - `TaskStatusBadge.tsx` - zastapiony przez `STATUS_CONFIG` w `UnifiedTaskRow`
   - `TaskTypeBadge.tsx` - uzywany w `ContactTasksTab` i `TasksTable`
   - `CrossTaskDetail.tsx` - stary widok szczegolow, zastapiony przez `TaskDetailSheet`

---

## Etap 1: Naprawa statusow (baza + kod)

### 1.1 Migracja bazy danych
- Zmiana domyslnej wartosci kolumny `status` z `'pending'` na `'todo'`
- Aktualizacja istniejacego rekordu z `status = 'pending'` na `'todo'`

### 1.2 Naprawa kodu - zamiana `pending` na `todo`
Pliki do edycji:
- `src/hooks/useTasks.ts` - `usePendingTasksCount`, `useCreateCrossTask`, `useCreateSubtask`, `useDuplicateTask` (5 zmian)
- `src/components/tasks/TaskModal.tsx` - domyslny status i reset (3 zmiany)
- `src/components/tasks/TaskDetailSheet.tsx` - subtask toggle (1 zmiana)
- `src/components/tasks/TasksKanban.tsx` - usunac mapowanie `pending -> todo` (2 zmiany)
- `src/components/tasks/TasksTeamView.tsx` - usunac mapowanie (1 zmiana)
- `src/components/dashboard/TeamTasksWidget.tsx` - filtr `pending` -> `todo` (1 zmiana)
- `src/components/dashboard/MyTasksWidget.tsx` - filtr `pending` -> `todo` (1 zmiana)
- `src/hooks/useConsultations.ts` - status tworzenia zadania (1 zmiana)
- `src/hooks/useContacts.ts` - filtr pending (1 zmiana)
- `src/pages/TeamProductivityReport.tsx` - fallback status (1 zmiana)
- `src/pages/TaskAnalytics.tsx` - fallback status (1 zmiana)
- `src/components/projects/ProjectDashboardCharts.tsx` - fallback (1 zmiana)
- `src/hooks/useActiveTaskContacts.ts` - sprawdzic czy uzywa pending
- `src/components/deals-team/WeeklyStatusForm.tsx` - juz uzywa `'todo'` (OK)

---

## Etap 2: Ujednolicenie widoku ContactTasksTab

### 2.1 Zamiana ContactTasksTab na UnifiedTaskRow
Plik `src/components/contacts/ContactTasksTab.tsx`:
- Usunac stary widok z `TaskPriorityBadge`, `TaskStatusBadge`, `TaskTypeBadge`
- Zamienic na `UnifiedTaskRow` z `onStatusChange` (cykliczna zmiana statusu)
- Uzyc `TaskDetailSheet` zamiast `CrossTaskDetail` do szczegolow
- Dodac filtr statusu z opcjami `todo`, `in_progress` (zamiast `pending`)
- Zachowac przycisk "Dodaj" i `TaskModal`

### 2.2 Usunac nieuzywane komponenty
Po zamianie ContactTasksTab, sprawdzic czy ponizssze sa jeszcze uzywane gdziekolwiek:
- `CrossTaskDetail.tsx` - jesli nie uzywany nigdzie indziej, usunac
- `TaskPriorityBadge.tsx` - sprawdzic MyTasks.tsx i TasksTable.tsx
- `TaskStatusBadge.tsx` - sprawdzic MyTasks.tsx i TasksTable.tsx

---

## Etap 3: Ujednolicenie widoku MyTasks

### 3.1 Zamiana MyTasks na UnifiedTaskRow
Plik `src/pages/MyTasks.tsx`:
- `TaskSectionList` - zamienic `Card + Checkbox` na `UnifiedTaskRow`
- Usunac import `TaskPriorityBadge`, `TaskStatusBadge`
- Zachowac grupowanie po sekcjach (overdue, today, this_week, later, no_date, completed)
- Zachowac podzial na zakladki "Moje" / "Zespolowe"

---

## Etap 4: Ujednolicenie TasksTable

### 4.1 Dostosowanie TasksTable
Plik `src/components/tasks/TasksTable.tsx`:
- Zamienic `TaskPriorityBadge`, `TaskStatusBadge`, `TaskTypeBadge` na elementy z `PRIORITY_CONFIG` i `STATUS_CONFIG`
- Lub zachowac tabelaryczny format ale z konsystentnymi ikonami/kolorami

---

## Etap 5: Czyszczenie komponentow (po zakonczeniu Etapow 2-4)

### 5.1 Usunac nieuzywane komponenty
Po potwierdzeniu braku importow:
- `src/components/tasks/TaskPriorityBadge.tsx`
- `src/components/tasks/TaskStatusBadge.tsx`
- `src/components/tasks/CrossTaskDetail.tsx`

### 5.2 Opcjonalnie - puste tabele
Tabele `task_categories`, `task_automation_rules`, `task_custom_fields`, `task_custom_field_values`, `task_workflow_history`, `saved_task_views` sa puste ale maja dzialajacy kod UI (panele w ustawieniach, modals). Mozna je zachowac jako przygotowanie na przyszlosc lub usunac jesli nie sa planowane. Rekomendacja: **zachowac** - nie blokuja niczego, a infrastruktura jest gotowa.

---

## Szczegoly techniczne - kolejnosc implementacji

1. Migracja DB (zmiana default `pending` -> `todo`, update 1 rekordu)
2. Naprawa `pending` w ~15 plikach TS/TSX
3. Refaktor `ContactTasksTab.tsx` na `UnifiedTaskRow` + `TaskDetailSheet`
4. Refaktor `MyTasks.tsx` na `UnifiedTaskRow`
5. Refaktor `TasksTable.tsx` na konsystentne style
6. Usunac nieuzywane komponenty
7. Test end-to-end

Kazdy etap jest niezalezny i moze byc realizowany osobno, ale etap 1 (naprawa statusow) powinien byc pierwszy.
