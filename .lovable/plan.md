
# Porządki: Sidebar CRM + Powiązanie zadań z projektami/klientami

## Podsumowanie

Dwie zmiany: (1) usunięcie duplikatu "Firmy" z menu CRM, (2) dodanie pola "Projekt" do formularza tworzenia/edycji zadań (TaskModal) -- tak aby z każdego widoku można było powiązać zadanie z projektem i klientem.

## Analiza obecnego stanu

### Menu CRM
- "Kontakty" `/contacts` i "Firmy" `/contacts?view=companies` prowadzą do tej samej strony -- przełącznik widoku jest już wbudowany w nagłówek Kontaktów (przyciski "Osoby" / "Firmy")
- "Firmy" w menu jest zbędne

### Zadania -- powiązania

| Widok | Kontakt | Projekt | Uwagi |
|-------|---------|---------|-------|
| Tasks page (TaskModal) | TAK (ConnectionContactSelect) | **NIE** | Brak pola project_id |
| Contact detail (ContactTasksTab) | TAK (preselectedContactId) | **NIE** | |
| Consultation (ConsultationTasksSection) | TAK (contact_id) | **NIE** | Osobna mutacja, nie używa TaskModal |
| Project detail (ProjectTasksTab) | Tylko wyświetla | **NIE** (read-only) | Mówi "dodaj z widoku Zadania" |
| Kanban inline create | NIE | TAK (prop) | Jedyne miejsce z project_id |
| Task detail sheet | Wyświetla kontakty | Wyświetla link do projektu | Read-only |

**Wniosek:** TaskModal nie ma pola "Projekt" -- to główny brak. Trzeba go dodać.

### Strona Zadania -- filtrowanie
Strona `/tasks` już ma rozbudowane filtry: status, typ, priorytet, projekt (ProjectFilterSelect), kontakt (TaskContactFilter), sortowanie. To jest OK.

## Zmiany do wykonania

### 1. AppSidebar.tsx -- usunięcie "Firmy"

Usunąć linię 55:
```text
{ title: 'Firmy', url: '/contacts?view=companies', icon: Building2, adminOnly: false },
```

Po usunięciu sekcja CRM będzie miała:
- Kontakty
- Sieć kontaktów (admin only)

Można też usunąć nieużywany import `Building2` z lucide (jeśli nie jest używany w adminItems -- sprawdzenie: jest używany w linii 178 dla Superadmin, więc import zostaje).

### 2. TaskModal.tsx -- dodanie pola "Projekt"

Dodać nowy state:
```text
const [projectId, setProjectId] = useState<string>('');
```

Dodać prop do TaskModal:
```text
preselectedProjectId?: string;
```

Dodać import `useProjects` z `@/hooks/useProjects`.

Dodać Select "Projekt" w formularzu (po polu "Kontakt", przed "Priorytet"):
```text
<div className="space-y-2">
  <Label>Projekt</Label>
  <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}>
    <SelectTrigger>
      <FolderKanban className="h-4 w-4 mr-2" />
      <SelectValue placeholder="Wybierz projekt (opcjonalne)" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Brak projektu</SelectItem>
      {projects?.map(p => (
        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

W `useEffect` reset/load:
- Nowe zadanie: `setProjectId(preselectedProjectId || '')`
- Edycja: `setProjectId(task.project_id || '')`

W `handleSubmit` -- przekazać `project_id` do mutacji:
```text
// Dla standard tasks:
createTask.mutateAsync({
  task: {
    ...existing fields,
    project_id: projectId || null,
  },
  ...
});

// Dla edycji:
updateTask.mutateAsync({
  ...existing fields,
  project_id: projectId || null,
});
```

Import `FolderKanban` z lucide-react.

### 3. ProjectTasksTab.tsx -- dodanie przycisku "Dodaj zadanie"

Obecnie wyświetla tylko tekst "Dodaj zadania z widoku Zadania". Zamiast tego dodać przycisk otwierający TaskModal z `preselectedProjectId`:

```text
- Import TaskModal, Button, Plus
- Dodać state: isModalOpen
- W empty state: przycisk "Dodaj zadanie" otwierający modal
- W nagłówku karty: przycisk "+" otwierający modal
- <TaskModal preselectedProjectId={projectId} />
```

### 4. ConsultationTasksSection -- bez zmian

Zadania z konsultacji mają swój własny uproszczony flow (inline input, nie dialog). Kontakt jest automatycznie przypisywany. Dodanie projektu tutaj byłoby nadmiarowe -- konsultacje nie są powiązane z projektami.

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Usunięcie "Firmy" z crmItems (linia 55) |
| `src/components/tasks/TaskModal.tsx` | Dodanie pola "Projekt" (Select z listą projektów), nowy prop `preselectedProjectId`, logika w useEffect i handleSubmit |
| `src/components/projects/ProjectTasksTab.tsx` | Dodanie przycisku "Dodaj zadanie" z TaskModal i preselectedProjectId |

## Czego NIE robimy

| Element | Powód |
|---------|-------|
| Modyfikacja TasksHeader/filtrów | Już mają filtr po projekcie i kontakcie -- działają poprawnie |
| Dodanie projektu do ConsultationTasksSection | Konsultacje nie są powiązane z projektami |
| Zmiana ContactTasksTab | Już ma preselectedContactId -- po dodaniu projektu do TaskModal, użytkownik będzie mógł wybrać projekt z listy |
| Modyfikacja KanbanInlineCreate | Już obsługuje project_id -- działa poprawnie |
| Usunięcie strony CompanyDetail | Strona firm jest nadal dostępna przez Kontakty -> zakładka Firmy |

## Kolejność wykonania

```text
1. AppSidebar.tsx -- usunięcie "Firmy"
2. TaskModal.tsx -- dodanie pola "Projekt" + prop preselectedProjectId
3. ProjectTasksTab.tsx -- dodanie przycisku "Dodaj zadanie" z TaskModal
```
