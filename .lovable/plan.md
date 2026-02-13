
# Zunifikowany komponent karty zadania + przepiecie osoby

## Cel
1. Utworzenie jednego wspolnego komponentu `UnifiedTaskRow` inspirowanego Asana/ClickUp, ktory bedzie uzywany we WSZYSTKICH miejscach systemu wyswietlajacych zadania w formie wiersza.
2. Dodanie funkcji przepiecia zadania do innej osoby w zespole (reassign).
3. Scalenie roznych implementacji kart zadan w jeden wzorzec.

## Obecny stan - 6 roznych renderow zadan

| Lokalizacja | Styl | Funkcje |
|---|---|---|
| `MyTeamTasksView.tsx` (TaskRow) | Asana-like row | Status cycle, inline edit, priority/assignee dropdown, subtask indicator |
| `TasksList.tsx` | Duze karty (Card) | Checkbox, badge'e, wirtualizacja |
| `TasksTable.tsx` | Tabela | Sortowanie, checkbox |
| `TasksKanban.tsx` | Karty drag & drop | D&D miedzy kolumnami |
| `DealContactDetailSheet.tsx` | Proste wiersze | Ikona statusu, checkbox |
| `ContactTasksPanel.tsx` | Proste wiersze | Checkbox, termin |

## Plan zmian

### 1. Nowy komponent: `src/components/tasks/UnifiedTaskRow.tsx`
Jeden wspolny wiersz zadania inspirowany najlepszymi rozwiazaniami (Asana/ClickUp), laczacy wszystkie funkcje:

- **Status cycle** - klikniecie ikony statusu przelacza: `todo` -> `in_progress` -> `completed`
- **Inline edit tytulu** - double-click na tytul
- **Priority dropdown** - kolorowa kropka z dropdownem do szybkiej zmiany
- **Assignee dropdown** - avatar z dropdownem do przepiecia osoby (opcjonalny, widoczny gdy przekazana lista czlonkow)
- **Subtask indicator** - pasek postepu subtaskow
- **Due date** - kolorowy termin (czerwony = przeterminowany, zolty = dzisiaj)
- **Menu kontekstowe** - szczegoly, edycja, duplikacja

Interfejs props:

```typescript
interface UnifiedTaskRowProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
    status: string | null;
    priority: string | null;
    due_date: string | null;
    assigned_to?: string | null;
    completed_at?: string | null;
  };
  // Opcjonalne - do przepiecia osoby
  members?: Array<{
    director_id: string;
    director?: { full_name: string };
  }>;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onPriorityChange?: (taskId: string, newPriority: string) => void;
  onAssigneeChange?: (taskId: string, newAssigneeId: string) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
  onClick?: (taskId: string) => void;
  compact?: boolean; // tryb kompaktowy dla paneli bocznych
  showSubtasks?: boolean;
  showAssignee?: boolean;
}
```

Wizualnie:
```text
[O] Tytul zadania...                [subtaski 2/5 ===] [12 mar] [Wysoki] [W trakcie] [AK] [...]
```

### 2. Aktualizacja: `src/components/deals-team/DealContactDetailSheet.tsx`
Zamiana recznych wierszy zadan (linie 341-422) na `UnifiedTaskRow` w trybie `compact`.

- Dodanie listy czlonkow zespolu z `useTeamMembers(teamId)` 
- Kazdy wiersz zadania uzywa `UnifiedTaskRow` z `showAssignee={true}` i `members={members}`
- Umozliwia szybkie przepiecie zadania do innej osoby bezposrednio z karty kontaktu

### 3. Aktualizacja: `src/components/contacts/ContactTasksPanel.tsx`
Zamiana prostych checkboxow na `UnifiedTaskRow` w trybie `compact`.

- Bez `members` (brak kontekstu zespolu) - nie pokazuje avatara
- Status cycle + priorytet + termin

### 4. Aktualizacja: `src/components/deals-team/MyTeamTasksView.tsx`
Zamiana wewnetrznego komponentu `TaskRow` (linie 141-345) na import `UnifiedTaskRow`.

- Przekazanie `members` do reassign
- Wszystkie istniejace funkcje zachowane (inline edit, subtasks, priority, status)
- Usuniety lokalny komponent `TaskRow` i `SubtaskIndicator` (przeniesione do `UnifiedTaskRow`)

### 5. Aktualizacja: `src/components/tasks/TasksList.tsx`
Zamiana wewnetrznych kart na `UnifiedTaskRow` (bez trybu compact).

- Zachowanie wirtualizacji (`useVirtualizer`)
- Kazdy `virtualItem` renderuje `UnifiedTaskRow` zamiast wlasnego Card
- Dodanie obslugi cross-task (ikonka Link2 przed tytulem)

### 6. `src/components/tasks/TasksKanban.tsx` - BEZ ZMIAN
Kanban uzywa kart (Card) z drag & drop - tutaj nie stosujemy UnifiedTaskRow, bo format jest inny (karty pionowe, nie wiersze). Kanban pozostaje bez zmian.

### 7. `src/components/tasks/TasksTable.tsx` - BEZ ZMIAN
Tabela ma wlasny uklad z kolumnami i sortowaniem - nie nadaje sie do zastapienia wierszem. Pozostaje bez zmian.

## Techniczne detale

### Statusy i kolory (wspolne stale wyeksportowane z UnifiedTaskRow)
```typescript
export const STATUS_CONFIG = {
  todo: { label: 'Do zrobienia', icon: Circle, color: 'text-muted-foreground' },
  in_progress: { label: 'W trakcie', icon: Clock, color: 'text-blue-500' },
  completed: { label: 'Zakonczone', icon: CheckCircle2, color: 'text-green-600' },
  cancelled: { label: 'Anulowane', icon: XCircle, color: 'text-muted-foreground' },
};

export const PRIORITY_CONFIG = {
  urgent: { label: 'Pilne', dot: 'bg-red-500' },
  high: { label: 'Wysoki', dot: 'bg-orange-500' },
  medium: { label: 'Sredni', dot: 'bg-blue-500' },
  low: { label: 'Niski', dot: 'bg-slate-400' },
};

export const STATUS_CYCLE = ['todo', 'in_progress', 'completed'];
```

### Przepiecie zadania (reassign)
Klikniecie avatara otwiera dropdown z lista czlonkow zespolu. Wybranie osoby wywoluje `onAssigneeChange(taskId, directorId)`. W hookach:
- `useUpdateAssignment` (deals) - juz obsluguje `assignedTo`
- `useUpdateTask` (CRM) - juz obsluguje `assigned_to`

### Brak zmian w bazie danych
Wszystkie potrzebne pola (`assigned_to`, `status`, `priority`, `due_date`) juz istnieja w tabeli `tasks`. Nie sa potrzebne migracje.

## Podsumowanie plikow do zmiany

| Plik | Operacja |
|---|---|
| `src/components/tasks/UnifiedTaskRow.tsx` | NOWY - glowny komponent |
| `src/components/deals-team/MyTeamTasksView.tsx` | Refactor - uzycie UnifiedTaskRow |
| `src/components/deals-team/DealContactDetailSheet.tsx` | Refactor - uzycie UnifiedTaskRow |
| `src/components/contacts/ContactTasksPanel.tsx` | Refactor - uzycie UnifiedTaskRow |
| `src/components/tasks/TasksList.tsx` | Refactor - uzycie UnifiedTaskRow |
