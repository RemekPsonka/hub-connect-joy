
# Plan rozbudowy Zadan i Projektow -- wzor Asana/HubSpot/ClickUp/Pipedrive

## Podsumowanie

Rozbudowa systemu zarzadzania zadaniami i projektami o najczesciej wykorzystywane funkcje z narzedzi klasy enterprise. Plan podzielony na 6 faz, kazda moze byc realizowana niezaleznie.

---

## FAZA 1: Widoki i nawigacja (Asana Multi-View)

### 1.1 Widok Timeline / Gantt (projekty)
- Wizualizacja zadan projektu na osi czasu (data start -- due_date)
- Pasek postepu dla kazdego zadania
- Drag-and-drop do zmiany terminow
- Nowa zakladka "Timeline" w widoku projektu
- Technologia: komponent oparty na CSS Grid, bez dodatkowych bibliotek

### 1.2 Widok Tabela (zadania)
- Trzeci widok obok Listy i Kanban
- Edycja inline (klikniecie w komorke = edycja)
- Sortowanie po kazdej kolumnie
- Kolumny: Tytul, Status, Priorytet, Termin, Przypisany, Projekt, Kategoria
- Technologia: TanStack Virtual (juz zainstalowany) + wlasny komponent tabeli

### 1.3 Widok Kalendarz (zadania)
- Czwarty widok -- zadania na kalendarzu miesiecznym/tygodniowym
- Drag-and-drop do zmiany terminow
- Kolor = priorytet lub kategoria
- Nowy komponent `TasksCalendar`

### 1.4 "Moje zadania" -- widok osobisty
- Filtrowane automatycznie po zalogowanym uzytkowniku (owner_id lub assigned_to)
- Sekcje: Dzisiaj, Ten tydzien, Pozniej, Zakonczne
- Szybkie akcje: zmien status, snooze, dodaj termin

---

## FAZA 2: Zaawansowane zadania (ClickUp Task Management)

### 2.1 Pola niestandardowe (Custom Fields)
- Nowa tabela `task_custom_fields` (definicje pol: text, number, date, select, url, checkbox)
- Nowa tabela `task_custom_field_values` (wartosci pol per zadanie)
- UI: sekcja "Dodatkowe pola" w TaskDetailSheet i TaskModal
- Mozliwosc tworzenia pol na poziomie projektu lub globalnie
- **Migracja DB**: 2 nowe tabele

### 2.2 Zaleznosci miedzy zadaniami (Dependencies)
- Nowa tabela `task_dependencies` (task_id, depends_on_task_id, type: blocks/blocked_by/related)
- Wizualizacja w TaskDetailSheet: "Blokowane przez", "Blokuje"
- Ostrzezenie przy zamykaniu zadania, ktore blokuje inne niezakonczone
- Linia laczaca na widoku Timeline/Gantt
- **Migracja DB**: 1 nowa tabela

### 2.3 Komentarze do zadan
- Nowa tabela `task_comments` (task_id, author_id, content, created_at)
- Sekcja komentarzy w TaskDetailSheet pod subtaskami
- Mozliwosc @mention (wyszukiwanie dyrektorow)
- Chronologiczna lista z avatarami
- **Migracja DB**: 1 nowa tabela

### 2.4 Powiadomienia i przypomnienia
- Nowa tabela `task_notifications` (task_id, director_id, type, read_at)
- Typy: assigned_to_me, due_soon (24h), overdue, comment_added, status_changed
- Ikona dzwonka w nawigacji z licznikiem nieprzeczytanych
- Edge function (cron) do generowania powiadomien due_soon/overdue
- **Migracja DB**: 1 nowa tabela + edge function

### 2.5 Etykiety / Tagi (Labels)
- Nowa tabela `task_labels` (name, color, tenant_id)
- Tabela laczaca `task_label_assignments` (task_id, label_id)
- Kolorowe chipy na kartach zadan
- Filtrowanie po etykietach w TasksHeader
- **Migracja DB**: 2 nowe tabele

### 2.6 Sledzenie czasu (Time Tracking)
- Rozbudowa istniejacych kolumn `estimated_hours` i `actual_hours`
- Timer start/stop w TaskDetailSheet
- Nowa tabela `task_time_entries` (task_id, director_id, started_at, ended_at, duration_minutes, note)
- Podsumowanie czasu per zadanie i per projekt
- **Migracja DB**: 1 nowa tabela

---

## FAZA 3: Projekty na poziomie enterprise (HubSpot/Asana Projects)

### 3.1 Kamienie milowe (Milestones)
- Nowa tabela `project_milestones` (project_id, name, due_date, status, sort_order)
- Wizualizacja na Timeline jako diamenty
- Grupowanie zadan pod kamienie milowe (kolumna `milestone_id` w tasks)
- Sekcja "Kamienie milowe" w widoku projektu
- **Migracja DB**: 1 nowa tabela + 1 kolumna w tasks

### 3.2 Sekcje / Grupy zadan w projekcie
- Nowa tabela `task_sections` (project_id, name, sort_order, color)
- Kolumna `section_id` w tasks
- W widoku projektu: zadania grupowane pod sekcjami (jak w Asana)
- Drag-and-drop miedzy sekcjami
- **Migracja DB**: 1 nowa tabela + 1 kolumna w tasks

### 3.3 Dashboard projektu (rozbudowa ProjectOverviewTab)
- Wykres spalania (burndown chart) -- recharts (juz zainstalowany)
- Wykres postepu per czlonek zespolu
- Rozklad priorytetow (pie chart)
- Overdue tasks alert
- Timeline mini-view

### 3.4 Szablony projektow (rozbudowa project_templates)
- Tabela `project_templates` juz istnieje -- dodanie struktury JSON z zadaniami
- Tworzenie projektu z szablonu = auto-generacja zadan z predefiniowanymi sekcjami
- Zarzadzanie szablonami w ustawieniach
- **Migracja DB**: dodanie kolumny `template_data` JSONB do `project_templates`

### 3.5 Daty startu i deadline projektu
- Dodanie kolumn `start_date` i `due_date` do tabeli `projects`
- Pasek postepu na liscie projektow
- Ostrzezenie o zblizajacym sie terminie
- **Migracja DB**: 2 nowe kolumny w projects

---

## FAZA 4: Automatyzacje i reguły (Asana Rules / HubSpot Workflows)

### 4.1 Reguły automatyczne
- Nowa tabela `task_automation_rules` (trigger, condition, action, project_id)
- Przyklady regul:
  - "Gdy status = completed -> przypisz nastepne zadanie"
  - "Gdy due_date minal -> zmien priorytet na urgent"
  - "Gdy wszystkie subtaski completed -> zamknij zadanie nadrzedne"
- UI: panel konfiguracji regul per projekt
- **Migracja DB**: 1 nowa tabela + edge function / trigger

### 4.2 Recurring Tasks (zadania cykliczne)
- Kolumny w tasks: `recurrence_rule` (JSONB: frequency, interval, end_date)
- Trigger DB: po zamknieciu recurring task -> tworzy nowe z przesunieta data
- UI: opcja "Powtarzaj" w TaskModal (codziennie, co tydzien, co miesiac, custom)
- **Migracja DB**: 1 nowa kolumna + trigger DB

### 4.3 Auto-assign
- Regula round-robin lub load-balancing per projekt
- Nowe zadanie w projekcie = automatyczne przypisanie do czlonka z najmniejsza liczba zadan
- Konfiguracja per projekt

---

## FAZA 5: Raportowanie i analityka (Pipedrive/HubSpot Reports)

### 5.1 Dashboard zadan
- Nowa strona `/tasks/analytics`
- Wykresy: zadania zakonczone w czasie, rozklad statusow, czas realizacji
- Filtrowanie po: okresie, projekcie, przypisanym, kategorii
- Porownanie tygodniowe (trend)

### 5.2 Raport produktywnosci zespolu
- Zadania na osobe (bar chart)
- Sredni czas realizacji per czlonek
- Overdue rate per osoba
- Eksport do XLSX (juz jest biblioteka)

### 5.3 Raport projektu
- Podsumowanie projektu: budzet czasu vs rzeczywisty
- Gantt snapshot (eksport do PDF -- jspdf juz zainstalowany)
- Status kamieni milowych
- Lista ryzyk (overdue, brak przypisania)

---

## FAZA 6: Integracje i UX (ClickUp/Asana Extras)

### 6.1 Drag-and-drop sortowanie
- Reorderowanie zadan w liscie (sort_order juz istnieje w DB)
- Reorderowanie subtaskow
- Reorderowanie sekcji w projekcie
- Technologia: @dnd-kit (juz zainstalowany)

### 6.2 Powielanie zadan
- Przycisk "Duplikuj" w TaskDetailSheet
- Kopiuje: tytul (+ " (kopia)"), opis, priorytet, kontakty, projekt, subtaski
- Nie kopiuje: status (reset do pending), komentarze, time entries

### 6.3 Szybkie akcje klawiaturowe
- `N` = nowe zadanie
- `K` = widok Kanban
- `L` = widok Lista
- `/` = focus na wyszukiwanie
- `Esc` = zamknij panel

### 6.4 Filtry zapisane (Saved Views)
- Nowa tabela `saved_task_views` (name, filters JSON, director_id)
- Zapisz aktualny zestaw filtrow pod nazwa
- Szybki dostep z dropdowna w TasksHeader
- **Migracja DB**: 1 nowa tabela

### 6.5 Aktywnosc / Historia zmian (Activity Log)
- Nowa tabela `task_activity_log` (task_id, actor_id, action, old_value, new_value, created_at)
- Trigger DB na UPDATE tasks -> loguj zmiany pol
- Sekcja "Historia" w TaskDetailSheet
- **Migracja DB**: 1 nowa tabela + trigger

---

## Podsumowanie techniczne

### Nowe tabele (lacznie ~12):
1. `task_custom_fields`
2. `task_custom_field_values`
3. `task_dependencies`
4. `task_comments`
5. `task_notifications`
6. `task_labels`
7. `task_label_assignments`
8. `task_time_entries`
9. `project_milestones`
10. `task_sections`
11. `task_automation_rules`
12. `saved_task_views`
13. `task_activity_log`

### Nowe kolumny w istniejacych tabelach:
- `tasks`: milestone_id, section_id, recurrence_rule
- `projects`: start_date, due_date
- `project_templates`: template_data (JSONB)

### Nowe komponenty (~20):
- TasksTable, TasksCalendar, TaskTimeline
- TaskComments, TaskDependencies, TaskCustomFields
- TaskTimeTracker, TaskActivityLog
- ProjectMilestones, ProjectDashboardCharts
- TaskLabelsSelect, SavedViewsDropdown
- NotificationBell, NotificationPanel
- ProjectGantt, TaskDuplicateButton
- AutomationRulesPanel, RecurrenceSelector

### Nowe hooki (~10):
- useTaskComments, useTaskDependencies, useTaskCustomFields
- useTaskTimeEntries, useTaskLabels, useTaskNotifications
- useProjectMilestones, useTaskSections
- useSavedTaskViews, useTaskActivityLog

### Nowe edge functions:
- `task-notifications-cron` -- generowanie powiadomien due_soon/overdue
- `task-recurrence` -- opcjonalnie, jesli trigger DB nie wystarczy

---

## Rekomendowana kolejnosc wdrazania

1. **Faza 2.3** (Komentarze) + **2.5** (Etykiety) -- najszybszy impact
2. **Faza 1.2** (Tabela) + **1.4** (Moje zadania) -- core UX
3. **Faza 2.2** (Zaleznosci) + **3.2** (Sekcje) -- organizacja
4. **Faza 6.1** (Drag-and-drop) + **6.2** (Duplikowanie) -- UX polish
5. **Faza 3.1** (Milestones) + **3.3** (Dashboard) -- project management
6. **Faza 4** (Automatyzacje) + **5** (Raportowanie) -- zaawansowane

Kazda faza jest niezalezna i moze byc realizowana iteracyjnie. Rekomenduje zaczynac od Fazy 2.3 + 2.5 jako "quick wins" z duzym wplywem na uzytecznosc.
