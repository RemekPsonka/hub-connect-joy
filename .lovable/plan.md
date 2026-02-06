

# Sovra — Tabele bazy danych + Edge Function sovra-morning-session

## Podsumowanie

Tworzymy fundamenty AI asystentki Sovra: dwie tabele w bazie danych (`sovra_sessions` i `sovra_reminders`) oraz Edge Function `sovra-morning-session`, ktora generuje poranny brief AI z danymi CRM i Google Calendar.

## Co sie zmieni

| Zmiana | Plik / Zasob |
|--------|-------------|
| Migracja SQL | Dwie nowe tabele: `sovra_sessions`, `sovra_reminders` z RLS + indeksy |
| Nowa Edge Function | `supabase/functions/sovra-morning-session/index.ts` |
| Modyfikacja | `supabase/config.toml` — wpis dla nowej funkcji |

## Szczegoly techniczne

### 1. Migracja SQL

Tabele nie istnieja jeszcze w bazie — zostana utworzone od zera.

**sovra_sessions** — przechowuje sesje AI (morning brief, evening debrief, chat):
- `id`, `tenant_id` (FK tenants), `director_id` (FK directors)
- `type` — CHECK ('morning', 'evening', 'debrief', 'chat')
- `title` — tytul sesji (np. "Poranny brief - 2026-02-06")
- `content` — jsonb z danymi sesji (brief_text, statystyki)
- `tasks_created`, `notes_created` — liczniki akcji podjqtych w sesji
- `started_at`, `ended_at` — timestamptz
- `metadata` — jsonb z kontekstem (surowe dane uzyte do generowania)

**sovra_reminders** — przypomnienia generowane przez Sovre:
- `id`, `tenant_id` (FK tenants), `director_id` (FK directors)
- `type` — CHECK ('contact', 'deadline', 'inactive_project', 'daily_summary', 'follow_up')
- `reference_id`, `reference_type` — opcjonalne powiazanie z encja CRM
- `message` — tresc przypomnienia
- `scheduled_at` — kiedy wyslac, `sent_at` — kiedy wyslano, `read_at` — kiedy przeczytano
- `channel` — CHECK ('app', 'email'), domyslnie 'app'
- `priority` — CHECK ('low', 'normal', 'high'), domyslnie 'normal'

Obie tabele z RLS: `tenant_id = get_current_tenant_id() AND director_id = get_current_director_id()`.
Indeksy na `(director_id, type)` dla sesji i `(director_id, scheduled_at) WHERE sent_at IS NULL` dla reminders.

### 2. Edge Function — sovra-morning-session

Funkcja generujaca poranny brief AI. Flow:

```text
1. CORS + metoda POST
2. Autentykacja przez verifyAuth() z _shared/auth.ts
3. Rate limit: Upstash Redis (3 wywolania/h/director)
   - Sekrety UPSTASH_REDIS_REST_URL i UPSTASH_REDIS_REST_TOKEN juz sa skonfigurowane
4. Pobranie imienia directora z tabeli directors
5. Rownolegle (Promise.all) pobranie danych kontekstowych:
   A) tasksToday — tasks WHERE due_date = TODAY, assigned_to = director_id, status != 'done'
   B) tasksOverdue — tasks WHERE due_date < TODAY, status NOT IN ('done','cancelled')
   C) activeProjects — projects WHERE status IN ('new','in_progress','analysis')
      i (owner_id = director_id OR director_id w project_members)
   D) todayEvents — gcal-events (jesli gcal_tokens istnieje), w przeciwnym razie []
   E) unreadReminders — sovra_reminders WHERE sent_at IS NULL, scheduled_at <= NOW()
   F) recentNotes — project_notes ORDER BY created_at DESC LIMIT 5
   G) tasksDoneYesterday — tasks WHERE updated_at >= wczoraj, status = 'done'
6. Budowa context string (structured plaintext, max ~4000 tokenow)
7. Wywolanie Lovable AI Gateway (Gemini 2.5 Flash)
8. Zapis sesji do sovra_sessions
9. Oznaczenie reminders jako wyslane (sent_at = NOW)
10. Zwrot JSON z brief + danymi
```

**Rate limiting** — implementacja bez zewnetrznego importu Upstash SDK (Deno nie obsluguje @upstash/ratelimit przez skypack). Zamiast tego: prosta logika sliding window bezposrednio przez Upstash REST API:
- GET klucza z Redis (lista timestampow)
- Sprawdz ile wywolan w ostatniej godzinie
- Jesli >= 3: zwroc 429
- Jesli < 3: ZADD timestamp i kontynuuj

**Google Calendar events** — pobierane wewnetrznie przez ten sam mechanizm co gcal-events (bezposrednie wywolanie Google Calendar API z tokenem z gcal_tokens, z auto-refresh). NIE wywolujemy innej Edge Function — duplikujemy logike refreshowania tokena i fetchowania eventow wewnatrz tej funkcji, korzystajac z serwisowego klienta Supabase.

**Lovable AI Gateway** — wywolanie:
- URL: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Header: `Authorization: Bearer ${LOVABLE_API_KEY}`
- Model: `google/gemini-2.5-flash`
- Messages: system prompt SOVRA_MORNING_SYSTEM_PROMPT + user message z kontekstem
- Bez streamingu (standardowy request/response)

**System prompt** — zdefiniowany jako stala w pliku Edge Function. Instrukcje dla Sovra:
- Styl: pewna siebie, konkretna, po polsku, uzywa imienia uzytkownika
- Format: powitanie, podsumowanie wczoraj, priorytety na dzis (TOP 3), spotkania, zaleglosci, projekty, motywacja
- Zasady: nie wymyslaj danych, logika dla piatku/poniedzialku, brak spotkan/zalegsosci = pozytywna informacja

**Fallback** — gdy Gemini jest niedostepny lub zwroci blad:
- Generowany jest prosty brief bez AI z surowymi danymi
- Format: "Dzien dobry, [imie]. Nie udalem sie wygenerowac pelnego briefu..." + listy taskow/eventow
- Sesja zapisywana z metadata.fallback = true

**Response** — JSON:
```text
{
  session_id: string,
  brief: string,
  data: {
    tasks_today: array,
    tasks_overdue: array,
    events: array,
    projects: array,
    reminders_cleared: number
  }
}
```

### 3. config.toml

Nowy wpis:
```text
[functions.sovra-morning-session]
verify_jwt = false
```

Uwaga: mimo ze plan mowi `verify_jwt = true`, w praktyce funkcja sama weryfikuje JWT przez `verifyAuth()` z _shared/auth.ts (ten sam wzorzec co wszystkie inne funkcje w projekcie). Ustawienie `verify_jwt = false` w config.toml jest zgodne z istniejacym wzorcem — kazda funkcja w projekcie ma `verify_jwt = false` i weryfikuje auth rucznie.

### 4. Sekrety

Wszystkie wymagane sekrety sa juz skonfigurowane:
- `LOVABLE_API_KEY` — do Lovable AI Gateway (auto-provisioned)
- `UPSTASH_REDIS_REST_URL` — do rate limitingu
- `UPSTASH_REDIS_REST_TOKEN` — do rate limitingu
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — do refreshowania tokenow GCal

Nie trzeba dodawac zadnych nowych sekretow.

## Bezpieczenstwo

- RLS na obu tabelach — kazdy dyrektor widzi tylko swoje sesje i reminders
- Rate limit 3/h/director zapobiega naduzywaniu AI
- Tokeny Google nie sa przekazywane do Gemini — tylko nazwy eventow i czasy
- Edge Function wymaga autentykacji (verifyAuth)
- Context string jest truncowany do ~4000 tokenow

## Co NIE zostanie zmienione

- Zadne istniejace Edge Functions (gcal-auth, gcal-events, ai-chat, remek-chat itd.)
- Zadne pliki frontendowe (UI Sovra bedzie w kolejnym prompcie)
- Zadne istniejace tabele w bazie danych
- Hook useGoogleCalendar — bez zmian

