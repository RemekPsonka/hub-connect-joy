
# Nastepna iteracja: Fazy 2.4, 2.6, 3.5, 4.2, 5.1

## Co zostanie zbudowane

### 1. Sledzenie czasu (Faza 2.6)
Timer start/stop w TaskDetailSheet. Logowanie wpisow czasu z notatkami. Porownanie z estimated_hours.

### 2. Powiadomienia zadaniowe (Faza 2.4)
Trzecia zakladka "Zadania" w istniejacym NotificationBell. Automatyczne alerty przy komentarzach i zmianach statusu.

### 3. Zadania cykliczne (Faza 4.2)
Kolumna recurrence_rule (JSONB) w tasks. Trigger DB tworzacy nowy egzemplarz po zakonczeniu. Selektor cyklicznosci w TaskModal.

### 4. Dashboard analityczny zadan (Faza 5.1)
Strona /tasks/analytics z wykresami trendu, statusow, priorytetow i obciazenia zespolu.

### 5. Daty projektu (Faza 3.5)
Kolumny start_date i due_date w projektach. Pasek postepu czasowego.

---

## Szczegoly techniczne

### Krok 1: Migracja bazy danych

**Nowe tabele:**
- task_notifications (id, task_id FK, director_id, type, title, message, read_at, tenant_id, created_at)
- task_time_entries (id, task_id FK, director_id, started_at, ended_at, duration_minutes, note, tenant_id, created_at)

**Nowe kolumny:**
- projects.start_date (DATE), projects.due_date (DATE)
- tasks.recurrence_rule (JSONB)

**Triggery:**
- on_task_comment_notify -- INSERT na task_comments -> powiadomienie dla ownera
- on_task_status_notify -- UPDATE tasks.status -> powiadomienie
- handle_recurring_task -- completed + recurrence_rule -> nowe zadanie

**RLS:** tenant_id matching z JWT
**Realtime:** task_notifications

### Krok 2: Time Tracking
- Nowy hook useTaskTimeEntries.ts (CRUD, suma czasu)
- Nowy komponent TaskTimeTracker.tsx (timer, lista wpisow, reczne dodawanie)
- Integracja w TaskDetailSheet po komentarzach

### Krok 3: Powiadomienia zadaniowe
- Nowy hook useTaskNotifications.ts (query, realtime, mark read)
- Modyfikacja NotificationBell.tsx -- trzecia zakladka "Zadania"

### Krok 4: Zadania cykliczne
- Nowy komponent RecurrenceSelector.tsx
- Integracja w TaskModal.tsx i TaskDetailSheet.tsx

### Krok 5: Dashboard analityczny
- Nowa strona TaskAnalytics.tsx (AreaChart, PieChart, BarChart)
- Route /tasks/analytics w App.tsx
- Link w AppSidebar.tsx

### Krok 6: Daty projektu
- Aktualizacja useProjects.ts (start_date, due_date)
- Sekcja dat w ProjectOverviewTab.tsx
- Daty w naglowku ProjectDetail.tsx

## Pliki do utworzenia (5)
1. src/hooks/useTaskTimeEntries.ts
2. src/hooks/useTaskNotifications.ts
3. src/components/tasks/TaskTimeTracker.tsx
4. src/components/tasks/RecurrenceSelector.tsx
5. src/pages/TaskAnalytics.tsx

## Pliki do modyfikacji (8)
1. src/components/tasks/TaskDetailSheet.tsx
2. src/components/tasks/TaskModal.tsx
3. src/components/notifications/NotificationBell.tsx
4. src/hooks/useProjects.ts
5. src/components/projects/ProjectOverviewTab.tsx
6. src/pages/ProjectDetail.tsx
7. src/App.tsx
8. src/components/layout/AppSidebar.tsx

## Kolejnosc
1. Migracja DB
2. Time Tracking (hook + komponent + integracja)
3. Powiadomienia (hook + zakladka w NotificationBell)
4. Recurring Tasks (selektor + integracja)
5. Dashboard analityczny (strona + routing)
6. Daty projektu (hook + UI)
