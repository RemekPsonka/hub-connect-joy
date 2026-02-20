
# Szybka edycja terminu z historia przesuniec

## Problem
W panelu szczegolowym zadania (TaskDetailSheet) pole "Data wykonania" jest tylko do odczytu. Nie mozna szybko zmienic terminu, a zmiany daty nie sa rejestrowane w historii zmian.

## Rozwiazanie

### 1. Migracja bazy danych — dodanie sledzenia zmian daty
Rozszerzenie istniejacego triggera `log_task_changes()` o sledzenie zmian `due_date`:

```text
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_director_id UUID;
BEGIN
  SELECT id INTO v_director_id FROM public.directors WHERE user_id = auth.uid() LIMIT 1;
  
  -- existing checks: status, priority, assigned_to, title ...
  
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO public.task_activity_log (task_id, actor_id, action, old_value, new_value, tenant_id)
    VALUES (NEW.id, v_director_id, 'due_date_changed', 
            OLD.due_date::text, NEW.due_date::text, NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 2. TaskDetailSheet — edytowalny termin inline
Zamiana statycznego tekstu daty na klikalny element z Popover + Calendar (react-day-picker):

- Klikniecie na date otwiera popover z kalendarzem
- Wybranie nowej daty natychmiast aktualizuje zadanie przez `updateTask.mutateAsync({ id, due_date })`
- Jesli zadanie nie ma daty — pokazuje przycisk "Dodaj termin"

### 3. TaskActivityLog — obsluga nowej akcji
Dodanie etykiety i formatowania dla `due_date_changed` w komponencie `TaskActivityLog.tsx`:

- `actionLabels`: `due_date_changed: 'Termin'`
- Nowa funkcja `formatValue` — formatuje daty w czytelny sposob (np. "17 lut 2026 -> 24 lut 2026")

### Pliki do zmiany:
1. **Migracja SQL** — rozszerzenie triggera o `due_date`
2. **`src/components/tasks/TaskDetailSheet.tsx`** — zamiana statycznego wyswietlania daty na Popover z kalendarzem
3. **`src/components/tasks/TaskActivityLog.tsx`** — dodanie etykiety i formatowania dla `due_date_changed`
