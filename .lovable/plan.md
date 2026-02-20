

# Naprawa flow zamykania zadan cyklicznych i wyswietlania powiazania z lejkiem

## Zidentyfikowane problemy

### 1. Przycisk "Otworz" w toast nie dziala
Po zakonczeniu zadania cyklicznego, wyswietlany jest toast z przyciskiem "Otworz", ktory emituje custom event `open-task`. Problem: **zaden komponent nie nasluchuje na ten event**. Przycisk nic nie robi.

### 2. Brak informacji o lejku (pipeline) w panelu szczegolów
Zadanie moze byc powiazane z lejkiem sprzedazy (`deal_team_id`), ale panel TaskDetailSheet nie wyswietla tej informacji. Uzytkownik nie wie, do ktorego lejka nalezy zadanie.

### 3. Blad "completed_at column not found"
Sesja uzytkownika pokazala blad: "Could not find the 'completed_at' column of 'tasks' in the schema cache". Tabela `tasks` nie ma kolumny `completed_at`. Jesli jakikolwiek kod probuje ja ustawic przy update, operacja sie nie powiiedzie.

## Plan naprawy

### Plik 1: `src/pages/Tasks.tsx` i `src/pages/MyTasks.tsx`
Dodac nasluchiwanie na event `open-task`:
- `useEffect` z `addEventListener('open-task', ...)` 
- Gdy event przyjdzie, pobrac zadanie po ID z supabase (lub z cache)
- Otworzyc TaskDetailSheet z nowym zadaniem
- Cleanup w `return` useEffect

### Plik 2: `src/components/tasks/TaskDetailSheet.tsx`
- Dodac wiersz "Lejek" w sekcji metadanych -- wyswietlic `task.deal_team?.name` z kolorem i linkiem do `/deals-team`
- Poprawic `handleComplete` i `handleStatusChange`: zamiast emitowac event `open-task`, uzyc callbacka przekazanego z rodzica (np. `onOpenNextTask?: (taskId: string) => void`)
- Alternatywnie: zachowac event ale dodac listener w samym komponencie, ktory pobierze i wyswietli nowe zadanie bezposrednio (zamieni `task` w stanie)
- Usunac ewentualne proby ustawiania `completed_at` na tabeli tasks (jesli istnieja)

### Podejscie do "Otworz nastepne zadanie"
Zamiast custom event, zmienie podejscie:
- Po zakonczeniu zadania cyklicznego i pobraniu nextTask, **nie zamykac sheeta** 
- Wyswietlic w panelu informacje "Zadanie zakonczone. Nastepne zadanie:" z przyciskiem
- Klikniecie przycisku zamieni wyswietlane zadanie na nowe (podmiana `task` w stanie rodzica przez callback `onTaskSwitch`)

### Plik 3: `src/pages/Tasks.tsx`
- Dodac callback `handleTaskSwitch` ktory zmienia `selectedTask` na nowe zadanie
- Przekazac go do `TaskDetailSheet` jako `onTaskSwitch`

### Plik 4: `src/pages/MyTasks.tsx`
- Analogiczna zmiana jak w Tasks.tsx

### Szczegoly techniczne

#### Wyswietlanie lejka w TaskDetailSheet (po sekcji "Kontakt"):
```
{task.deal_team && (
  <MetaRow label="Lejek">
    <div className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline"
         onClick={() => navigate('/deals-team')}>
      <FolderKanban className="h-3.5 w-3.5" />
      <span>{task.deal_team.name}</span>
    </div>
  </MetaRow>
)}
```

#### Mechanizm podmiany zadania po zakonczeniu cyklicznego:
```typescript
// TaskDetailSheet - handleComplete
const handleComplete = async () => {
  await updateTask.mutateAsync({ id: task.id, status: 'completed' });
  if ((task as any).recurrence_rule) {
    toast.success('Zadanie zakonczone. Tworze nastepne...');
    setTimeout(async () => {
      const { data: nextTask } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('source_task_id', task.id)
        .eq('status', 'todo')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (nextTask && onTaskSwitch) {
        toast.success(`Nastepne: ${nextTask.title}`, {
          duration: 8000,
          action: {
            label: 'Otworz',
            onClick: () => onTaskSwitch(nextTask.id),
          },
        });
      }
      onOpenChange(false);
    }, 800);
  } else {
    toast.success('Zadanie zakonczone');
    onOpenChange(false);
  }
};
```

#### W Tasks.tsx / MyTasks.tsx:
```typescript
const handleTaskSwitch = async (taskId: string) => {
  const task = allTasks.find(t => t.id === taskId);
  if (task) {
    setSelectedTask(task);
    setIsDetailOpen(true);
  } else {
    // Fetch from DB if not in cache yet
    const { data } = await supabase
      .from('tasks')
      .select('*, deal_team:deal_teams(id, name, color), task_contacts(...), ...')
      .eq('id', taskId)
      .single();
    if (data) {
      setSelectedTask(data as TaskWithDetails);
      setIsDetailOpen(true);
    }
  }
};
```

### Pliki do zmiany:
1. `src/components/tasks/TaskDetailSheet.tsx` -- dodanie lejka, naprawa flow zamykania
2. `src/pages/Tasks.tsx` -- dodanie handleTaskSwitch i przekazanie do sheeta
3. `src/pages/MyTasks.tsx` -- analogiczne zmiany

