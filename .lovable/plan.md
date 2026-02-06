
# Sovra Chat — Edge Function (streaming) + Strona /sovra

## Podsumowanie

Budujemy glowny chat AI asystentki Sovra: Edge Function `sovra-chat` ze streaming response i pelnym kontekstem CRM, plus dedykowana strona `/sovra` z profesjonalnym UI czatu — historia sesji w sidebarze, streaming z migajacym kursorem, quick actions i kontekst z URL params.

## Co sie zmieni

| Zmiana | Plik / Zasob |
|--------|-------------|
| Nowa Edge Function | `supabase/functions/sovra-chat/index.ts` — streaming chat z kontekstem CRM |
| Modyfikacja | `supabase/config.toml` — wpis dla sovra-chat |
| Nowy hook | `src/hooks/useSovraChat.ts` — streaming, sesje, stan czatu |
| Nowy hook | `src/hooks/useSovraSessions.ts` — lista historycznych sesji |
| Nowa strona | `src/pages/Sovra.tsx` — pelny chat UI |
| Modyfikacja | `src/App.tsx` — lazy route `/sovra` |
| Modyfikacja | `src/components/layout/AppSidebar.tsx` — link "Sovra" w grupie AI |
| Modyfikacja | `src/components/layout/Breadcrumbs.tsx` — label "Sovra" |

---

## Szczegoly techniczne

### 1. Edge Function — sovra-chat

Streamingowa funkcja czatu z pelnym kontekstem projektow, zadan i kontaktow. Wzorowana na istniejacym `ai-chat/index.ts` (streaming proxy) i `sovra-morning-session/index.ts` (auth + rate limit + context).

**Flow:**

```text
1. CORS + metoda POST
2. Autentykacja: verifyAuth(req, serviceClient) z _shared/auth.ts
3. Walidacja Zod:
   - message: string min(1) max(2000)
   - session_id: string uuid optional
   - context_type: enum('general','project','contact','task') default 'general'
   - context_id: string uuid optional
4. Rate limit: Upstash Redis sliding window (10 wywolan / 1 min / director)
   - Klucz: sovra-chat:{director_id}
   - RATE_LIMIT_MAX = 10, RATE_LIMIT_WINDOW_MS = 60_000
5. Pobranie danych kontekstowych (Promise.all):
   A) directorInfo — imie i rola z directors
   B) activeProjects — do 10 projektow (status new/in_progress/analysis)
   C) recentTasks — do 15 zadan (nie done, sortowane po due_date)
   D) Kontekst specyficzny:
      - context_type='project': projekt + taski + notatki
      - context_type='contact': kontakt + firma + profil
      - context_type='task': zadanie + projekt + subtaski
   E) conversationHistory — jesli session_id: pobierz content.messages z sovra_sessions (ostatnie 20)
6. Budowa messages array:
   [system_prompt, context_message, ...previousMessages, user_message]
7. Wywolanie Lovable AI Gateway:
   - URL: https://ai.gateway.lovable.dev/v1/chat/completions
   - Model: google/gemini-2.5-flash
   - stream: true
   - temperature: 0.7
8. Streaming proxy z zapisem sesji:
   - Proxy body streamu do klienta
   - Po zakonczeniu streamu: zapisz/aktualizuj sovra_sessions
   - Session ID przesylany w custom headerze X-Sovra-Session-Id
9. Obsluga bledow AI (429, 402, 500) — JSON error response
```

**System prompt (SOVRA_CHAT_SYSTEM_PROMPT):**
Zdefiniowany jako stala. Instrukcje osobowosci Sovra: pewna siebie, konkretna, po polsku, uzywa imienia uzytkownika, max 300 slow, markdown oszczednie, sugeruje akcje (taski formatowane jako emoji + bold + priorytet + deadline), nie wymysla danych. Zgodny z treseq z promptu uzytkownika.

**Zapis sesji (saveSovraSession):**
- Jesli `session_id` w request: pobierz istniejaca sesje, dodaj nowe wiadomosci do `content.messages`, UPDATE
- Jesli brak `session_id`: INSERT nowa sesja type='chat', title generowany z pierwszej wiadomosci (pierwsze 50 znakow), content = `{ messages: [{role, content, timestamp}] }`
- Zwracanie session_id przez header `X-Sovra-Session-Id` w response

**Rate limiting:**
- Ta sama implementacja co w sovra-morning-session (Upstash REST API pipeline)
- Inny klucz (`sovra-chat:`) i inne limity (10/min zamiast 3/h)

### 2. config.toml

Nowy wpis:
```text
[functions.sovra-chat]
verify_jwt = false
```

Zgodnie z wzorcem projektu — wszystkie funkcje maja `verify_jwt = false` i weryfikuja auth rucznie przez `verifyAuth()`.

### 3. Hook useSovraChat (src/hooks/useSovraChat.ts)

Stan i logika czatu. Wzorowany na streamingu z `src/hooks/useAIChat.ts` i zarzadzaniu sesjami z `src/hooks/useRemekChat.ts`.

**Eksporty:**
- `messages: SovraMessage[]` — lista wiadomosci
- `isStreaming: boolean` — czy trwa streaming
- `sessionId: string | null` — aktualny ID sesji
- `sendMessage(text, contextType?, contextId?)` — wysyla wiadomosc, streamuje odpowiedz
- `loadSession(id)` — laduje historyczna sesje z sovra_sessions
- `newSession()` — czysci wiadomosci, resetuje sessionId
- `contextType / contextId` — aktualny kontekst (z URL params lub manualnie)
- `setContext(type, id)` — ustawia kontekst

**Typ SovraMessage:**
```text
{ role: 'user' | 'assistant', content: string, timestamp: Date }
```

**Streaming:**
- Fetch do `${VITE_SUPABASE_URL}/functions/v1/sovra-chat` z auth tokenem
- SSE parsing identyczny jak w useAIChat.ts (line-by-line, handle CRLF, partial JSON, [DONE])
- Odczyt `X-Sovra-Session-Id` z response headers po zakonczeniu streamu
- Update ostatniej wiadomosci assistant w state (nie push nowej na kazdy chunk)
- Error handling: 429 → toast "Limit wiadomosci", 402 → toast "Wymagana platnosc"

### 4. Hook useSovraSessions (src/hooks/useSovraSessions.ts)

Prosta lista sesji do sidebara.

- useQuery `['sovra-sessions']`
- SELECT id, type, title, started_at, tasks_created FROM sovra_sessions WHERE director_id = me ORDER BY started_at DESC LIMIT 50
- Zwraca: `{ sessions: SovraSession[], isLoading }`
- Typ SovraSession: `{ id, type, title, started_at, tasks_created }`

### 5. Strona Sovra (src/pages/Sovra.tsx)

Pelny chat UI z historia sesji. Layout:

```text
+--------------------------------------------------+
| [Hamburger] Sovra                         [badge] |
+--------------------------------------------------+
|  Sidebar (w-64)  |     Main Chat Area             |
|  +-----------+   |                                |
|  | Nowa rozm |   |  [Welcome screen / Messages]  |
|  | Szukaj... |   |                                |
|  +-----------+   |                                |
|  | Sesja 1   |   |                                |
|  | Sesja 2   |   |                                |
|  | Sesja 3   |   |                                |
|  +-----------+   |  [Context indicator]           |
|                  |  [Input area + Send]            |
+--------------------------------------------------+
```

**A) Left sidebar (w-64, desktop only):**
- Header: "Sovra" text-lg font-bold + Button ghost Plus "Nowa rozmowa" (wywoluje newSession)
- Lista sesji z useSovraSessions:
  - Kazda: px-3 py-2 rounded-lg cursor-pointer hover:bg-muted
  - Title: text-sm font-medium truncate
  - Type badge: morning "Brief", chat "Chat", debrief "Debrief"
  - Date: text-xs text-muted-foreground (format relative lub data)
  - Active: bg-muted border border-border
- Mobile: sidebar ukryty, dostepny jako Sheet z hamburger button

**B) Main chat area:**
- Welcome screen (gdy brak wiadomosci):
  - Avatar Sovra: w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600, litera "S"
  - Tytul: "Czesc, jestem Sovra" text-xl font-semibold
  - Opis: "Twoja asystentka projektowa"
  - Quick actions grid 2x2:
    1. "Poranny brief" → auto-send "Wygeneruj moj poranny brief"
    2. "Moje priorytety" → auto-send "Jakie sa moje priorytety na dzis?"
    3. "Status projektow" → auto-send "Pokaz status moich projektow"
    4. "Sugestie kontaktow" → auto-send "Kogo powinienem skontaktowac w tym tygodniu?"
  - Kazdy: bg-card border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm

- Messages:
  - User: flex justify-end, bubble bg-primary text-primary-foreground rounded-2xl rounded-br-md max-w-[70%]
  - Sovra: flex justify-start gap-3, avatar (gradient violet-indigo "S") + bubble bg-card border rounded-2xl rounded-bl-md max-w-[70%]
  - Sovra bubble: react-markdown rendering (prose prose-sm), oszczedny markdown
  - Streaming cursor: w-1.5 h-4 bg-primary animate-pulse inline-block (widoczny gdy isStreaming i ostatnia wiadomosc assistant)
  - Auto-scroll: useRef na koncu listy wiadomosci + scrollIntoView({ behavior: 'smooth' }) w useEffect na zmiane messages

**C) Input area (border-t, sticky bottom):**
- Textarea: auto-resize (min 1 linia, max 4), rounded-xl, focus:ring-primary
- Placeholder: "Napisz do Sovry..."
- Send button: bg-primary rounded-lg p-2, ikona Send
- Enter = send, Shift+Enter = nowa linia
- Disabled podczas streaming (button → Loader2 spinner)

**D) Context indicator (nad inputem, opcjonalny):**
- Jesli contextType ustawiony: bg-primary/5 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs
- "Kontekst: Projekt [nazwa]" / "Kontekst: Kontakt [nazwa]" z X button do usuniecia
- Ustawiany z URL params: `/sovra?context=project&id=xxx`
- Pobranie nazwy encji przez dodatkowy useQuery

### 6. Routing (App.tsx)

- Nowy lazy import: `const Sovra = lazy(() => import("./pages/Sovra"));`
- Nowy route w DirectorGuard: `<Route path="/sovra" element={<DirectorGuard><Sovra /></DirectorGuard>} />`
- Umieszczony obok istniejacych route'ow AI

### 7. Sidebar (AppSidebar.tsx)

- Zmiana w grupie AI:
  - Zastapienie "AI Chat" (url: /ai) przez "Sovra" (url: /sovra, icon: Sparkles)
  - Zachowanie "Wyszukiwanie AI" (url: /search) bez zmian
  - Stary route /ai nadal dziala (nie usuwamy go) — ale w nawigacji priorytet ma Sovra

### 8. Breadcrumbs (Breadcrumbs.tsx)

- Dodanie wpisu: `'sovra': 'Sovra'` w routeLabels

## Sekrety

Wszystkie wymagane sekrety juz sa skonfigurowane:
- LOVABLE_API_KEY — Lovable AI Gateway
- UPSTASH_REDIS_REST_URL i UPSTASH_REDIS_REST_TOKEN — rate limiting

## Bezpieczenstwo

- Edge Function wymaga autentykacji (verifyAuth)
- Tylko dyrektorzy maja dostep (userType === 'director')
- Rate limit 10 wiadomosci/min/director
- Dane CRM pobierane przez service role client z filtrami tenant_id
- Zod walidacja inputu (max 2000 znakow)
- Session ID zwracany przez header (nie w stream body) — unika problemu z parsowaniem

## Co NIE zostanie zmienione

- Edge Functions: ai-chat, remek-chat, sovra-morning-session — bez zmian
- Strona /ai (AIChat.tsx) — bez zmian (nadal dostepna, ale sidebar prowadzi do /sovra)
- Tabele sovra_sessions i sovra_reminders — juz istnieja, bez modyfikacji schematu
- Hooki useAIChat, useRemekChat — bez zmian
- Komponenty RemekChatWidget — bez zmian
