

# Dodanie brakujących triggerów bazodanowych

## Co zostanie zbudowane

Trzy triggery bazodanowe zapewniające automatyzację workflow:

1. **handle_recurring_task** -- po zmianie statusu zadania na `completed`, jeśli zadanie ma `recurrence_rule` (JSONB), automatycznie tworzy nowe zadanie z wyliczonym kolejnym `due_date`
2. **on_task_comment_notify** -- po dodaniu komentarza do zadania, generuje powiadomienie dla właściciela zadania (i przypisanego)
3. **on_task_status_notify** -- po zmianie statusu zadania, generuje powiadomienie dla właściciela i przypisanego

---

## Szczegoly techniczne

### Jedna migracja SQL z trzema funkcjami i triggerami:

### 1. handle_recurring_task

- **Trigger:** AFTER UPDATE na `tasks`, warunek: `OLD.status != 'completed' AND NEW.status = 'completed' AND NEW.recurrence_rule IS NOT NULL`
- **Logika funkcji:**
  - Parsuje `recurrence_rule` JSONB (format: `{"frequency": "daily|weekly|monthly", "interval": 1}`)
  - Wylicza nowy `due_date` na podstawie `NEW.due_date + interval`
  - INSERT nowego zadania z tym samym `title`, `description`, `priority`, `project_id`, `section_id`, `owner_id`, `assigned_to`, `tenant_id`, `recurrence_rule`, nowym `due_date`, status `pending`
  - Ustawia `source_task_id` na `NEW.id` (powiazanie z oryginalem)

### 2. on_task_comment_notify

- **Trigger:** AFTER INSERT na `task_comments`
- **Logika funkcji:**
  - Pobiera zadanie (`task_id`) z tabeli `tasks`
  - Generuje powiadomienia w `task_notifications` dla:
    - `owner_id` zadania (jesli != autor komentarza)
    - `assigned_to` zadania (jesli != autor i != owner)
  - Typ: `comment_added`, tytul: "Nowy komentarz", wiadomosc: skrocona tresc komentarza

### 3. on_task_status_notify

- **Trigger:** AFTER UPDATE na `tasks`, warunek: `OLD.status IS DISTINCT FROM NEW.status`
- **Logika funkcji:**
  - Generuje powiadomienia w `task_notifications` dla:
    - `owner_id` (jesli istnieje i != aktualny uzytkownik)
    - `assigned_to` (jesli istnieje, != owner, != aktualny uzytkownik)
  - Typ: `status_changed`, tytul: "Zmiana statusu zadania", wiadomosc: "[tytul]: [stary status] -> [nowy status]"

### Wazne detale:
- Funkcje uzywaja `SECURITY DEFINER` aby miec dostep do tabel niezaleznie od RLS
- Wszystkie trzy triggery sa niezalezne od istniejacych (`auto_assign_task_trigger`, `log_task_changes_trigger`)
- `owner_id` w tabeli `tasks` jest typu TEXT (UUID jako string) -- konieczne castowanie na UUID przy INSERT do `task_notifications.director_id`

## Pliki do zmiany
1. Nowa migracja SQL (jedyna zmiana -- brak zmian w kodzie frontendu, poniewaz `useTaskNotifications.ts` juz obsluguje Realtime na tabeli `task_notifications`)

