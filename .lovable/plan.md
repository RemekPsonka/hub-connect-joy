
# Sovra Debrief — Edge Function + UI trybu debriefow

## Podsumowanie

Dodajemy trzeci tryb Sovra — debrief spotkania. Uzytkownik opisuje co sie wydarzylo na spotkaniu (tekstem lub mowa), a Sovra analizuje notatke i generuje: podsumowanie, kluczowe punkty, decyzje, proponowane taski (do zatwierdzenia) i follow-upy. Calowsc integruje sie z kalendarza (quick action w popoverze) i projektami.

## Co sie zmieni

| Zmiana | Plik / Zasob |
|--------|-------------|
| Nowa Edge Function | `supabase/functions/sovra-debrief/index.ts` |
| Modyfikacja | `supabase/config.toml` — wpis dla sovra-debrief |
| Nowy komponent | `src/components/sovra/SovraDebrief.tsx` — formularz + wyniki |
| Nowy komponent | `src/components/sovra/SovraMorningBrief.tsx` — tryb briefu |
| Nowy komponent | `src/components/sovra/SovraModeSelector.tsx` — przelacznik trybow |
| Nowy hook | `src/hooks/useSovraDebrief.ts` — mutacja debriefu + tworzenie taskow |
| Modyfikacja | `src/pages/Sovra.tsx` — dodanie trybow (chat / debrief / morning) |
| Modyfikacja | `src/components/calendar/CalendarEventPopover.tsx` — przycisk "Debrief z Sovra" |

---

## Szczegoly techniczne

### 1. Edge Function — sovra-debrief

Funkcja non-streaming (standardowy request/response z JSON). Wzorowana na `sovra-morning-session` (auth, rate limit, AI gateway) ale z tool calling zamiast wolnego tekstu — wymuszamy ustrukturyzowany JSON output.

**Flow:**

```text
1. CORS + metoda POST
2. Autentykacja: verifyAuth(req, serviceClient)
3. Zod walidacja:
   - raw_text: string min(10) max(5000)
   - gcal_event_id: string optional
   - gcal_calendar_id: string optional
   - project_id: uuid optional
   - contact_ids: array of uuid optional
4. Rate limit: Upstash Redis (10 wywolan / 1h / director)
   - Klucz: sovra-debrief:{director_id}
5. Pobranie kontekstu (Promise.all):
   A) directorInfo — imie z directors
   B) Jesli gcal_event_id + gcal_calendar_id — pobierz event z Google Calendar API
      (ten sam wzorzec co w sovra-morning-session: gcal_tokens -> access_token -> refresh jesli wygasly -> GET event)
   C) Jesli project_id — pobierz projekt + recent tasks + members
   D) Jesli contact_ids — pobierz kontakty z full_name, company, position
6. Budowa promptu z kontekstem + raw_text
7. Wywolanie Lovable AI Gateway (Gemini 2.5 Flash):
   - Tool calling (nie stream) — wymuszenie zwrotu structured JSON
   - Tool: analyze_debrief z parametrami: summary, key_points, decisions, action_items, follow_ups, meeting_sentiment, next_meeting_suggested, raw_note_cleaned
   - tool_choice: { type: "function", function: { name: "analyze_debrief" } }
8. Parsowanie tool call response
9. Zapis do sovra_sessions: type='debrief', content = parsed result + raw_text
10. Jesli project_id — INSERT do project_notes z source='sovra_debrief'
11. Zwrot JSON response
```

**System prompt (SOVRA_DEBRIEF_SYSTEM_PROMPT):**
Instrukcje do analizy surowych notatek ze spotkania. Kazdy ze Sovra generuje: summary (2-3 zdania), key_points, decisions, action_items (z title, description, priority, suggested_deadline, suggested_assignee_hint), follow_ups (z contact_name, action, urgency), meeting_sentiment, next_meeting_suggested, raw_note_cleaned (poprawione literowki, ustrukturyzowane).

**Kluczowe roznice vs sovra-chat:**
- Non-streaming (tool calling wymaga pelnej odpowiedzi)
- Structured output przez tool calling (nie parsujemy wolnego tekstu JSON)
- Zapis do project_notes jesli project_id podany
- Rate limit 10/h (nie 10/min jak chat)

**Response JSON:**
```text
{
  session_id: string,
  summary: string,
  key_points: string[],
  decisions: string[],
  action_items: Array<{
    title: string,
    description: string,
    priority: "critical" | "high" | "medium" | "low",
    suggested_deadline: string | null,
    suggested_assignee_hint: string
  }>,
  follow_ups: Array<{
    contact_name: string,
    action: string,
    urgency: "high" | "medium" | "low"
  }>,
  meeting_sentiment: "positive" | "neutral" | "negative",
  next_meeting_suggested: boolean,
  raw_note_cleaned: string,
  note_saved: boolean,
  note_id: string | null
}
```

**Fallback:** Jesli AI zwroci blad lub nieparsowalna odpowiedz — zwroc prosty fallback z samym raw_text jako summary i pustymi tablicami.

### 2. config.toml

Nowy wpis:
```text
[functions.sovra-debrief]
verify_jwt = false
```

### 3. Hook useSovraDebrief (src/hooks/useSovraDebrief.ts)

Dwie mutacje:
- `useRunDebrief()` — wywoluje sovra-debrief Edge Function, zwraca parsed result
- `useCreateDebriefTasks()` — tworzy wybrane taski w DB (INSERT do tasks, tak jak useCreateTask w useTasks.ts ale uproszczone — bezposredni insert z tenant_id, owner_id, assigned_to=director, project_id z kontekstu)

Typ `DebriefResult` — mirror odpowiedzi Edge Function.

### 4. Komponent SovraModeSelector (src/components/sovra/SovraModeSelector.tsx)

Pill selector nad glownym obszarem:
- Trzy opcje: "Chat" (💬), "Debrief" (📝), "Brief" (☀️)
- Aktywny: bg-card shadow-sm rounded-md font-medium
- Inactive: text-muted-foreground hover:text-foreground
- Stan sterowany z Sovra.tsx

### 5. Komponent SovraDebrief (src/components/sovra/SovraDebrief.tsx)

Dwu-etapowy UI:

**Etap 1 — Formularz:**
- Heading "Debrief spotkania" + opis
- Context selectors (opcjonalne):
  - "Spotkanie z kalendarza" — Select z dzisiejszymi GCal eventami (useGCalEvents)
  - "Projekt" — Select z aktywnymi projektami
  - "Uczestnicy" — multi-select z wyszukiwaniem kontaktow CRM
- Textarea min-h-[200px] z placeholderem opisujacym przykladowe notatki
- Button "Analizuj z Sovra" — Sparkles icon, disabled jesli < 10 znakow

**Etap 2 — Wyniki (po odpowiedzi, zastepuje formularz):**
- Header: Sovra avatar + "Analiza Sovry" + sentiment badge (positive/neutral/negative)
- Sekcja "Podsumowanie" — DataCard z summary
- Sekcja "Kluczowe punkty" — lista z ikonami CheckCircle
- Sekcja "Decyzje" — lista (tylko jesli decisions.length > 0)
- Sekcja "Proponowane zadania" — KLUCZOWA:
  - Kazdy action_item jako card z checkbox + title + description + priority badge + deadline
  - User zaznacza checkboxy -> "Stworz zaznaczone" -> useCreateDebriefTasks -> INSERT do tasks
  - Po stworzeniu: badge "Utworzono" na zielono + toast success
- Sekcja "Follow-upy" — kazdy z contact_name + action + urgency badge + "Utworz reminder" button
  - "Utworz reminder" -> INSERT do sovra_reminders z type='follow_up', scheduled_at = NOW + 1 dzien
- Sekcja "Oczyszczona notatka" — collapsible z Collapsible component
  - Jesli project_id: badge "Zapisano w projekcie [nazwa]"
- Footer: "Nowy debrief" (reset) + "Otworz w chacie" (przelacz na chat z session_id)

### 6. Komponent SovraMorningBrief (src/components/sovra/SovraMorningBrief.tsx)

Tryb morning brief w /sovra:
- Auto-trigger: wywolaj sovra-morning-session Edge Function (przez supabase.functions.invoke)
- Loading: Sovra avatar z pulse + "Sovra przygotowuje Twoj poranny brief..."
- Po zaladowaniu: brief wyswietlony jako markdown w DataCard
- Pod briefem: statystyki (tasks today, overdue, events, projects)
- Button "Kontynuuj w chacie" -> przelacz na chat z session_id briefu

### 7. Modyfikacja Sovra.tsx

Dodanie stanu `mode: 'chat' | 'debrief' | 'morning'` i parsowanie URL params:
- `?mode=debrief&event=xxx&calendar=yyy` -> auto-set debrief z pre-fill eventem
- `?context=project&id=xxx` -> zachowane jak dotychczas (chat z kontekstem)

Layout:
```text
+--------------------------------------------------+
|  Sidebar  |  [ModeSelector: Chat | Debrief | Brief] |
|           |  [Content based on mode]               |
|           |  [Input (only in chat mode)]            |
+--------------------------------------------------+
```

- mode='chat': dotychczasowy SovraMessages + SovraInput (bez zmian)
- mode='debrief': SovraDebrief component
- mode='morning': SovraMorningBrief component

### 8. Quick action w CalendarEventPopover

Dodanie przycisku "Debrief z Sovra" w popoverze wydarzenia GCal:
- Ikona Sparkles, variant ghost, text-xs
- onClick: navigate(`/sovra?mode=debrief&event=${gcalEventId}&calendar=${calendarId}`)
- Wyswietlany tylko dla gcal_event (nie crm_task)
- Umieszczony pod istniejacym "Otworz w Google Calendar"

### 9. Sekrety

Wszystkie wymagane sekrety juz sa skonfigurowane — brak nowych:
- LOVABLE_API_KEY
- UPSTASH_REDIS_REST_URL / TOKEN
- GOOGLE_CLIENT_ID / CLIENT_SECRET

## Bezpieczenstwo

- Edge Function wymaga autentykacji (verifyAuth)
- Rate limit 10/h/director
- Zod walidacja inputu (raw_text max 5000 znakow)
- Taski NIE sa tworzone automatycznie — user musi zatwierdzic kazdy
- project_notes zapisywane tylko jesli user podal project_id
- Dane CRM pobierane przez service role z filtrami tenant_id

## Co NIE zostanie zmienione

- sovra-chat Edge Function — bez zmian
- sovra-morning-session Edge Function — bez zmian (reuse przez supabase.functions.invoke na froncie)
- Tabele sovra_sessions, sovra_reminders — bez zmian schematu (wykorzystujemy istniejace kolumny)
- Istniejace komponenty Sovra (SovraAvatar, SovraMessages, SovraInput, SovraWelcome, SovraSidebar) — bez zmian
- Hook useSovraChat — bez zmian
- Hook useSovraSessions — bez zmian
