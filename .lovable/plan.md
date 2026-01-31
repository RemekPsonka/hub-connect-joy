

## Plan: Rozbudowa Modułu Zadań o Prywatność, Kategorie i Workflow

### Cel biznesowy
System zadań ma wspierać pracę zespołową z zachowaniem prywatności indywidualnych zadań. Każdy członek zespołu widzi swoje zadania prywatne oraz współdzielone zadania zespołowe. Kategorie zadań z predefiniowanymi workflow (np. "Top 100 klientów", "Follow-up handlowy") pozwalają na monitorowanie postępów w KPI.

---

## Część 1: Rozszerzenie Bazy Danych

### Nowe kolumny w tabeli `tasks`
```text
tasks (rozszerzenie):
+------------------+----------+--------------------------------------------------+
| Kolumna          | Typ      | Opis                                             |
+------------------+----------+--------------------------------------------------+
| owner_id         | uuid     | Kto utworzył zadanie (FK -> directors.id)        |
| assigned_to      | uuid     | Komu przypisane (FK -> directors.id), nullable   |
| visibility       | text     | 'private' | 'team' | 'public'                    |
| category_id      | uuid     | Kategoria zadania (FK -> task_categories.id)     |
| workflow_step    | text     | Aktualny krok workflow, np. 'schedule_meeting'   |
| snoozed_until    | date     | Odroczenie zadania do daty (ping reminder)       |
| source_task_id   | uuid     | Zadanie-rodzic (dla follow-upów)                 |
+------------------+----------+--------------------------------------------------+
```

### Nowa tabela `task_categories`
```text
task_categories:
+------------------+----------+--------------------------------------------------+
| Kolumna          | Typ      | Opis                                             |
+------------------+----------+--------------------------------------------------+
| id               | uuid     | PK                                               |
| tenant_id        | uuid     | FK -> tenants                                    |
| name             | text     | Nazwa kategorii, np. "Top 100 klientów"          |
| description      | text     | Opis kategorii                                   |
| color            | text     | Kolor (hex)                                      |
| icon             | text     | Nazwa ikony (lucide)                             |
| visibility_type  | text     | 'individual' | 'team' | 'shared'                 |
| is_kpi           | boolean  | Czy kategoria jest KPI do monitorowania          |
| kpi_target       | integer  | Cel KPI (np. 100 spotkań)                        |
| workflow_steps   | jsonb    | Definicja kroków workflow (patrz niżej)          |
| sort_order       | integer  | Kolejność wyświetlania                           |
| is_active        | boolean  | Czy aktywna                                      |
| created_at       | timestamp|                                                  |
+------------------+----------+--------------------------------------------------+
```

### Struktura `workflow_steps` (JSONB)
```json
{
  "steps": [
    { "id": "schedule_meeting", "name": "Umów spotkanie", "order": 1, "required": true },
    { "id": "meeting_held", "name": "Spotkanie odbyło się", "order": 2, "required": true },
    { "id": "write_followup", "name": "Opisz dalsze kroki", "order": 3, "required": true },
    { "id": "cooperation_started", "name": "Podjęcie współpracy", "order": 4, "required": false }
  ],
  "auto_complete_on": "cooperation_started",
  "allow_snooze": true,
  "snooze_creates_ping": true
}
```

### Nowa tabela `task_workflow_history`
```text
task_workflow_history:
+------------------+----------+--------------------------------------------------+
| Kolumna          | Typ      | Opis                                             |
+------------------+----------+--------------------------------------------------+
| id               | uuid     | PK                                               |
| task_id          | uuid     | FK -> tasks                                      |
| step_id          | text     | ID kroku z workflow                              |
| completed_by     | uuid     | FK -> directors.id                               |
| completed_at     | timestamp|                                                  |
| notes            | text     | Notatki do kroku                                 |
+------------------+----------+--------------------------------------------------+
```

---

## Część 2: Logika Widoczności (RLS)

### Zasady widoczności zadań
```text
1. visibility = 'private'   → widzi tylko owner_id
2. visibility = 'team'      → widzi owner_id + assigned_to + cały tenant
3. visibility = 'public'    → widzi każdy (np. dla publicznych celów)

Kategoria z visibility_type = 'individual':
  → Nowe zadania domyślnie mają visibility = 'private'

Kategoria z visibility_type = 'team':
  → Nowe zadania domyślnie mają visibility = 'team'

Kategoria z visibility_type = 'shared':
  → Nowe zadania mogą mieć visibility = 'private' lub 'team' (wybór użytkownika)
```

### RLS Policy dla tasks (rozszerzona)
```sql
-- Użytkownik widzi zadania:
-- 1. Gdzie jest właścicielem (owner_id)
-- 2. Gdzie jest przypisany (assigned_to)
-- 3. Które są zespołowe (visibility = 'team') i należą do jego tenanta
CREATE POLICY "Users see own and team tasks" ON public.tasks
FOR SELECT USING (
  owner_id = current_user_director_id()
  OR assigned_to = current_user_director_id()
  OR (visibility = 'team' AND tenant_id = current_user_tenant_id())
);
```

---

## Część 3: Zmiany w UI

### A. Dashboard - Nowy układ priorytetów pracy

```text
+---------------------------------------------------------------+
| 🎯 MOJE PRIORYTETY DZIŚ                                       |
+---------------------------------------------------------------+
| [Tab: Moje] [Tab: Zespołowe] [Tab: KPI]                       |
+---------------------------------------------------------------+
|                                                               |
| 📋 Top 100 klientów (KPI: 23/100)                [Progress]   |
|   ├─ Jan Kowalski (ABC Sp.)    [Umów spotkanie]    [Otwórz]   |
|   ├─ Anna Nowak (XYZ S.A.)     [Spotkanie 14:00]   [Otwórz]   |
|   └─ +15 więcej...                                            |
|                                                               |
| 🔄 Follow-upy handlowe (3 oczekujące)                         |
|   ├─ Oferta dla Firmy X        [Ping za 2 dni]     [Otwórz]   |
|   └─ Prezentacja Y             [Czeka na odpowiedź][Otwórz]   |
|                                                               |
| 📌 Moje zadania prywatne (5)                                  |
|   ├─ Przygotować raport        [Pilne]             [Otwórz]   |
|   └─ +4 więcej...                                             |
|                                                               |
+---------------------------------------------------------------+
```

### B. Panel Administracyjny - Zarządzanie Kategoriami

Nowa zakładka w Settings: **"Kategorie zadań"**

```text
+---------------------------------------------------------------+
| KATEGORIE ZADAŃ                                    [+ Dodaj]  |
+---------------------------------------------------------------+
| 🎯 Top 100 klientów                                           |
|    Typ: Zespołowa | KPI: 100 | Workflow: 4 kroki    [Edytuj]  |
|                                                               |
| 🔄 Follow-up handlowy                                         |
|    Typ: Współdzielona | Workflow: 3 kroki           [Edytuj]  |
|                                                               |
| 📋 Zadania operacyjne                                         |
|    Typ: Indywidualna | Brak workflow                [Edytuj]  |
+---------------------------------------------------------------+
```

### C. Modal dodawania kategorii

```text
+---------------------------------------------------------------+
| NOWA KATEGORIA ZADAŃ                                          |
+---------------------------------------------------------------+
| Nazwa:        [Top 100 klientów                    ]          |
| Opis:         [Spotkania z kluczowymi klientami... ]          |
| Kolor:        [🔵 Niebieski ▼]                                |
| Ikona:        [🎯 Target ▼]                                   |
|                                                               |
| ── Typ widoczności ──                                         |
| ○ Indywidualna (tylko twórca widzi)                           |
| ● Zespołowa (wszyscy w firmie widzą)                          |
| ○ Współdzielona (twórca wybiera)                              |
|                                                               |
| ── Monitorowanie KPI ──                                       |
| ☑ Ta kategoria to KPI                                         |
|   Cel: [100] zadań                                            |
|                                                               |
| ── Workflow (kroki) ──                                        |
| 1. [Umów spotkanie            ] [🗑]                          |
| 2. [Spotkanie odbyło się      ] [🗑]                          |
| 3. [Opisz dalsze kroki        ] [🗑]                          |
| 4. [Podjęcie współpracy       ] [🗑]                          |
| [+ Dodaj krok]                                                |
|                                                               |
|                          [Anuluj]  [Zapisz]                   |
+---------------------------------------------------------------+
```

### D. Rozbudowany TaskModal

```text
+---------------------------------------------------------------+
| NOWE ZADANIE                                                  |
+---------------------------------------------------------------+
| Tytuł:       [Spotkanie z Jan Kowalski - ABC Sp.   ]          |
|                                                               |
| Kategoria:   [🎯 Top 100 klientów ▼]                          |
|                                                               |
| Kontakt:     [🔍 Jan Kowalski (ABC Sp. z o.o.)     ]          |
|                                                               |
| Przypisz do: [○ Ja  ○ Kolega ▼]                               |
|              (jeśli zespołowa kategoria)                      |
|                                                               |
| Priorytet:   [● Średni ▼]   Termin: [📅 2024-02-15]           |
|                                                               |
|                          [Anuluj]  [Utwórz]                   |
+---------------------------------------------------------------+
```

### E. Szczegóły zadania z workflow

```text
+---------------------------------------------------------------+
| 🎯 Spotkanie z Jan Kowalski - ABC Sp.                         |
| Kategoria: Top 100 klientów | Właściciel: Ja                  |
+---------------------------------------------------------------+
|                                                               |
| POSTĘP WORKFLOW                                    [2/4 ✓]    |
| ━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━○━━━━━━━━━○                 |
|                                                               |
| ✅ Umów spotkanie           12 sty 2024, 10:30                |
| ✅ Spotkanie odbyło się     15 sty 2024, 14:00                |
|    Notatki: "Zainteresowany ofertą premium..."                |
|                                                               |
| ⏳ Opisz dalsze kroki       [Oznacz jako wykonane]            |
| ○ Podjęcie współpracy                                         |
|                                                               |
| ── LUB ──                                                     |
|                                                               |
| [🔔 Odrocz i przypomnij za: 7 dni ▼]                          |
| [👤 Przekaż do: Anna (handlowiec) ▼]                          |
|                                                               |
+---------------------------------------------------------------+
```

---

## Część 4: Funkcje i przepływy

### Flow 1: Tworzenie zadania KPI
```text
1. Użytkownik wybiera kategorię "Top 100 klientów"
2. System automatycznie:
   - Ustawia visibility = 'team'
   - Ustawia workflow_step = 'schedule_meeting' (pierwszy krok)
   - Pokazuje w dashboardzie KPI
```

### Flow 2: Przekazanie zadania
```text
1. Użytkownik klika "Przekaż do: Anna"
2. System:
   - Tworzy nowe zadanie (source_task_id = oryginalne)
   - assigned_to = Anna
   - visibility = 'team' (Anna i twórca widzą)
   - Wysyła notyfikację do Anny
```

### Flow 3: Odroczenie z pingiem
```text
1. Użytkownik klika "Odrocz o 3 miesiące"
2. System:
   - Ustawia snoozed_until = today + 3 miesiące
   - Zadanie znika z dashboardu
   - Za 3 miesiące: wraca jako "PING: Wróć do tematu"
```

---

## Część 5: Pliki do utworzenia/modyfikacji

### Nowe pliki:
| Plik | Opis |
|------|------|
| `src/hooks/useTaskCategories.ts` | CRUD dla kategorii zadań |
| `src/components/settings/TaskCategoriesManager.tsx` | Panel admina dla kategorii |
| `src/components/settings/TaskCategoryModal.tsx` | Modal dodawania/edycji kategorii |
| `src/components/tasks/TaskWorkflowProgress.tsx` | Wizualizacja postępu workflow |
| `src/components/tasks/TaskSnoozeModal.tsx` | Modal odraczania zadania |
| `src/components/tasks/TaskDelegateModal.tsx` | Modal przekazywania zadania |
| `src/components/dashboard/TasksByCategory.tsx` | Widget KPI/kategorii na dashboardzie |
| `src/components/dashboard/MyTasksWidget.tsx` | Widget prywatnych zadań |
| `src/components/dashboard/TeamTasksWidget.tsx` | Widget zespołowych zadań |

### Modyfikowane pliki:
| Plik | Zmiany |
|------|--------|
| `src/hooks/useTasks.ts` | Dodanie filtrów visibility, category, owner |
| `src/components/tasks/TaskModal.tsx` | Dodanie wyboru kategorii, assignee |
| `src/components/tasks/CrossTaskDetail.tsx` | Rozszerzenie o workflow |
| `src/pages/Tasks.tsx` | Filtr po kategoriach i widoczności |
| `src/pages/Dashboard.tsx` | Nowe widgety zadań |
| `src/pages/Settings.tsx` | Nowa zakładka "Kategorie zadań" |

---

## Część 6: Migracja SQL

```sql
-- 1. Rozszerzenie tabeli tasks
ALTER TABLE public.tasks 
ADD COLUMN owner_id uuid REFERENCES public.directors(id),
ADD COLUMN assigned_to uuid REFERENCES public.directors(id),
ADD COLUMN visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
ADD COLUMN category_id uuid,
ADD COLUMN workflow_step text,
ADD COLUMN snoozed_until date,
ADD COLUMN source_task_id uuid REFERENCES public.tasks(id);

-- 2. Tabela kategorii
CREATE TABLE public.task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  icon text DEFAULT 'list-todo',
  visibility_type text DEFAULT 'individual' CHECK (visibility_type IN ('individual', 'team', 'shared')),
  is_kpi boolean DEFAULT false,
  kpi_target integer,
  workflow_steps jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Historia workflow
CREATE TABLE public.task_workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  completed_by uuid REFERENCES public.directors(id),
  completed_at timestamptz DEFAULT now(),
  notes text
);

-- 4. RLS dla kategorii
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own tenant categories" ON public.task_categories
FOR ALL USING (tenant_id = get_current_tenant_id());

-- 5. Aktualizacja RLS dla tasks
DROP POLICY IF EXISTS "Users can view own tenant tasks" ON public.tasks;
CREATE POLICY "Users see own and team tasks" ON public.tasks
FOR SELECT USING (
  tenant_id = get_current_tenant_id() AND (
    owner_id = (SELECT id FROM public.directors WHERE user_id = auth.uid() LIMIT 1)
    OR assigned_to = (SELECT id FROM public.directors WHERE user_id = auth.uid() LIMIT 1)
    OR visibility IN ('team', 'public')
  )
);
```

---

## Kolejność implementacji

1. ✅ **Faza 1 (baza):** Migracja SQL - nowe kolumny i tabele
2. ✅ **Faza 2 (kategorie):** Hook + panel admina kategorii
3. ✅ **Faza 3 (task modal):** Rozszerzenie modalu o kategorie i przypisanie
4. ⏳ **Faza 4 (workflow):** Komponent postępu workflow + historia
5. ✅ **Faza 5 (dashboard):** Nowe widgety zadań na dashboardzie (KPI, Moje, Zespołowe)
6. ⏳ **Faza 6 (odroczenie):** Funkcja snooze + ping reminder
7. ⏳ **Faza 7 (delegacja):** Przekazywanie zadań + notyfikacje

---

## Wykonane zmiany (31.01.2026)

### Baza danych:
- Rozszerzono tabelę `tasks` o: `owner_id`, `assigned_to`, `visibility`, `category_id`, `workflow_step`, `snoozed_until`, `source_task_id`
- Utworzono tabelę `task_categories` z workflow_steps (JSONB)
- Utworzono tabelę `task_workflow_history`
- Dodano RLS z logiką widoczności (private/team/public)
- Dodano funkcję helper `get_current_director_id()`

### Nowe pliki:
- `src/hooks/useTaskCategories.ts` - CRUD dla kategorii
- `src/hooks/useDirectors.ts` - pobieranie dyrektorów
- `src/components/settings/TaskCategoriesManager.tsx` - panel zarządzania
- `src/components/settings/TaskCategoryModal.tsx` - modal dodawania/edycji
- `src/components/dashboard/KPITasksWidget.tsx` - widget KPI
- `src/components/dashboard/MyTasksWidget.tsx` - widget prywatnych zadań
- `src/components/dashboard/TeamTasksWidget.tsx` - widget zespołowych

### Zmodyfikowane pliki:
- `src/hooks/useTasks.ts` - rozszerzono o filtry visibility, categoryId, ownerId, assignedTo, excludeSnoozed
- `src/components/tasks/TaskModal.tsx` - dodano wybór kategorii, przypisanie, widoczność
- `src/pages/Dashboard.tsx` - dodano widgety zadań
- `src/pages/Settings.tsx` - nowa zakładka "Kategorie zadań"

### Do zrobienia:
- Komponent workflow progress w szczegółach zadania
- Modal snooze (odroczenie zadania)
- Modal delegacji (przekazanie zadania)
- Filtrowanie na stronie /tasks po kategoriach i widoczności

