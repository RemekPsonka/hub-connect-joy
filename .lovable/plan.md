

# System przypomnien Sovra — Edge Function + Bell UI + My Day

## Podsumowanie

Budujemy automatyczny system przypomnien Sovra: Edge Function generujaca przypomnienia na bazie logiki SQL (deadline, overdue, nieaktywne projekty, kontakty do follow-up), hook do zarzadzania przypomnieniami, rozszerzony Bell w headerze o sekcje Sovra, oraz nowa sekcja na stronie /my-day.

## Co sie zmieni

| Zmiana | Plik / Zasob |
|--------|-------------|
| Nowa Edge Function | `supabase/functions/sovra-reminder-trigger/index.ts` |
| Wpis w config | `supabase/config.toml` |
| Nowy hook | `src/hooks/useSovraReminders.ts` |
| Nowy komponent | `src/components/sovra/SovraRemindersCard.tsx` |
| Modyfikacja | `src/components/notifications/NotificationBell.tsx` |
| Modyfikacja | `src/pages/MyDay.tsx` |
| Modyfikacja | `src/components/layout/AppLayout.tsx` (auto-trigger) |

---

## Szczegoly techniczne

### 1. Edge Function — sovra-reminder-trigger

Czysta logika SQL/JS — BEZ AI. Wywolywalana cyklicznie lub manualnie.

**Autoryzacja (dwie sciezki):**

```text
A) Service-role call (cron): 
   Authorization = Bearer SERVICE_ROLE_KEY
   → Porownaj token z Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
   → Jesli rowny: pobierz WSZYSTKICH directorow z tabeli directors
   → Przetworz kazdego

B) JWT call (manual z frontendu):
   → verifyAuth(req, serviceClient) jak standardowo
   → Przetworz tylko tego directora
   
C) Brak autoryzacji → return 401
```

**Checks per director (z tenant_id filtrami):**

CHECK 1 — Deadline jutro:
```text
SELECT id, title, due_date, project_id FROM tasks
WHERE assigned_to = {director_id}
  AND due_date = CURRENT_DATE + 1
  AND status NOT IN ('done','cancelled')
  AND NOT EXISTS (
    SELECT 1 FROM sovra_reminders 
    WHERE reference_id = tasks.id 
      AND type = 'deadline' 
      AND DATE(scheduled_at) = CURRENT_DATE
  )
```
Dla kazdego: INSERT sovra_reminders (tenant_id, director_id, type='deadline', reference_type='task', reference_id, message='Zadanie "[title]" ma deadline jutro.', scheduled_at=NOW(), priority='high')

CHECK 2 — Overdue (przeterminowane):
```text
SELECT id, title, due_date FROM tasks
WHERE assigned_to = {director_id}
  AND due_date < CURRENT_DATE
  AND status NOT IN ('done','cancelled')
  AND NOT EXISTS (
    SELECT 1 FROM sovra_reminders
    WHERE reference_id = tasks.id
      AND type = 'overdue'
      AND DATE(scheduled_at) = CURRENT_DATE
  )
```
INSERT z type='overdue', priority='high', message wylicza ile dni przeterminowane.

CHECK 3 — Nieaktywne projekty (7 dni bez update):
```text
SELECT id, name FROM projects
WHERE owner_id = {director_id}
  AND status IN ('new','in_progress','analysis')
  AND updated_at < NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM sovra_reminders
    WHERE reference_id = projects.id
      AND type = 'inactive_project'
      AND scheduled_at > NOW() - INTERVAL '7 days'
  )
```
INSERT z type='inactive_project', reference_type='project', priority='normal'.

CHECK 4 — Kontakty bez interakcji (30 dni, top 5):
```text
SELECT id, full_name FROM contacts
WHERE tenant_id = {tenant_id}
  AND last_contact_date < NOW() - INTERVAL '30 days'
  AND last_contact_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sovra_reminders
    WHERE reference_id = contacts.id
      AND type = 'contact'
      AND scheduled_at > NOW() - INTERVAL '14 days'
  )
ORDER BY relationship_strength DESC NULLS LAST
LIMIT 5
```
INSERT z type='contact', reference_type='contact', priority='normal'.

**UWAGA:** Pola w tabeli contacts to `last_contact_date` (date) i `relationship_strength` (integer) — nie jak w oryginalnym spec.

**Limit dzienny:** Przed kazdym INSERT sprawdzaj:
```text
SELECT COUNT(*) FROM sovra_reminders
WHERE director_id = {director_id}
  AND DATE(scheduled_at) = CURRENT_DATE
```
Jesli >= 20 → nie tworzmy wiecej.

**Response:**
```text
{ 
  reminders_created: number, 
  by_type: { deadline: number, overdue: number, inactive_project: number, contact: number } 
}
```

### 2. config.toml

Nowy wpis:
```text
[functions.sovra-reminder-trigger]
verify_jwt = false
```
verify_jwt = false bo cron wywoluje z service_role — autoryzacja wewnetrzna.

### 3. Hook useSovraReminders (src/hooks/useSovraReminders.ts)

**useUnreadReminders():**
- queryKey: `['sovra-reminders-unread']`
- Query: `sovra_reminders` WHERE `director_id = me` AND `read_at IS NULL` ORDER BY priority DESC (high first), scheduled_at DESC
- refetchInterval: 60000 (co minute)
- Zwraca: `{ reminders, count, isLoading }`

**useMarkReminderRead():**
- Mutation: UPDATE `sovra_reminders` SET `read_at = NOW()` WHERE `id = reminder_id`
- onSuccess: invalidate `['sovra-reminders-unread']`

**useMarkAllRemindersRead():**
- Mutation: UPDATE `sovra_reminders` SET `read_at = NOW()` WHERE `director_id = me` AND `read_at IS NULL`
- onSuccess: invalidate + toast success

**useDismissReminder():**
- Mutation: DELETE FROM `sovra_reminders` WHERE `id = reminder_id`
- onSuccess: invalidate + toast info

**useTriggerReminders():**
- Mutation: fetch sovra-reminder-trigger Edge Function z JWT
- onSuccess: invalidate `['sovra-reminders-unread']`
- Zwraca tez wynik (reminders_created) zeby caller mogl zdecydowac czy pokazac toast

**Type SovraReminder:**
```text
{
  id: string
  type: string           // 'deadline' | 'overdue' | 'inactive_project' | 'contact' | 'follow_up'
  reference_id: string | null
  reference_type: string | null  // 'task' | 'project' | 'contact'
  message: string
  scheduled_at: string
  priority: string       // 'high' | 'normal'
  read_at: string | null
}
```

### 4. NotificationBell.tsx — rozszerzenie

Istniejacy NotificationBell obsluguje tabele `notifications`. Rozszerzamy go o sekcje Sovra:

**Zmiana badge count:**
- Nowy count = `unreadCount` (notifications) + `sovraCount` (sovra_reminders unread)
- Badge wyswietla laczna wartosc

**Zmiana Popover content — dwie zakladki (Tabs):**
```text
[Powiadomienia] [Sovra]
```

Zakladka "Powiadomienia" — istniejacy kod BEZ ZMIAN.

Zakladka "Sovra":
- Header: "Przypomnienia Sovry" + jesli count > 0: "Oznacz wszystkie" button
- Lista (ScrollArea max-h-[400px]):
  - Kazdy reminder: hover:bg-muted/30, unread ma bg-violet-50/50 border-l-2 border-violet-500
  - Icon w-8 h-8 rounded-full:
    - deadline/overdue: bg-red-50 text-red-500, Clock icon
    - inactive_project: bg-amber-50 text-amber-500, FolderOpen icon
    - contact: bg-blue-50 text-blue-500, Users icon
    - follow_up: bg-emerald-50 text-emerald-500, ArrowRight icon
  - Content: message text-sm, relative time text-xs, priority high: "Pilne" badge
  - Dismiss button (X) na hover
  - Klik na reminder: navigate (task->tasks, project->projects/:id, contact->contacts/:id) + markRead
- Empty state: Sparkles icon + "Brak przypomnien" + "Sovra Cie poinformuje..."
- Footer: "Odswierz" button -> useTriggerReminders() z loading spinner

### 5. SovraRemindersCard (src/components/sovra/SovraRemindersCard.tsx)

Komponent DataCard na strone /my-day:

- title: "Przypomnienia Sovry"
- action: Badge z count unread (jesli > 0)
- Jesli unread > 0: lista max 5 najnowszych reminders
  - Identyczny layout jak w Bell ale bez dismiss X
  - Klik -> navigate + markRead
- Jesli unread === 0: Sparkles icon + "Wszystko pod kontrola" + "Sovra sprawdza Twoje projekty i zadania"
- Footer: "Odswierz" button

### 6. MyDay.tsx — modyfikacja

Dodanie SovraRemindersCard w prawej kolumnie (right column), POMIEDZY GCalTodayEvents a DataCard "Moje projekty":

```text
{/* Google Calendar events */}
<GCalTodayEvents />

{/* Sovra reminders — NOWE */}
<SovraRemindersCard />

{/* Active projects */}
<DataCard title="Moje projekty">...
```

Import: `import { SovraRemindersCard } from '@/components/sovra/SovraRemindersCard';`

### 7. AppLayout.tsx — auto-trigger on login

Dodanie komponentu `<SovraReminderAutoTrigger />` do AppLayout (obok RemekChatWidget).

Logika (wewnatrz komponentu lub useEffect):
```text
1. Sprawdz localStorage: 'sovra-reminder-last-trigger'
2. Jesli nie ma LUB > 30 minut temu:
   a) Wywolaj sovra-reminder-trigger (ciche — bez toast)
   b) Zapisz Date.now() do localStorage
3. Jesli < 30 minut temu: nic nie rob
```

Komponent bedzie zdefiniowany inline w AppLayout (lub jako oddzielny maly komponent). Nie wymaga renderowania UI — to czysty side-effect.

---

## Bezpieczenstwo

- Edge Function: autoryzacja wewnetrzna (service_role LUB JWT) — brak publicznego dostepu
- Wszystkie query filtruja po `director_id` / `tenant_id` — izolacja danych miedzy uzytkownikami
- De-duplikacja: `NOT EXISTS` zapobiega spamowaniu (ten sam reminder nie powstanie dwa razy dziennie)
- Limit 20 reminders/dzien/director — ochrona przed zalewem
- Brak AI — czysta logika, zero ryzyka hallucynacji
- Istniejace RLS na `sovra_reminders` (policy `sovra_reminders_own`) — chroni odczyty po stronie klienta

## Co NIE zostanie zmienione

- Edge Functions: sovra-chat, sovra-debrief, sovra-morning-session — bez zmian
- Tabela sovra_reminders — bez zmian schematu (juz istnieje z odpowiednimi kolumnami)
- Istniejacy system notifications (tabela `notifications`, hook `useNotifications`) — bez zmian (zakladka "Powiadomienia" zachowana 1:1)
- Inne strony, hooki, komponenty — bez zmian

