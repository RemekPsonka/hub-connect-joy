
Użytkownik wrzucił sprint-12 MD, ale pole wiadomości puste. Wcześniej anulował diagnozę bug #ba8c3ace (sovra-confirm create_task). Dwa wątki otwarte:

1. **Bug create_task** — fix już wdrożony (owner_id, status='todo', task_contacts). Anulowanie sugeruje że user nie chce dalszej diagnozy / uznał za zamknięte.
2. **Sprint 12** — nowy plan: AIRecsWidget + CalendarWidget.

Sprint 12 wymaga **Sprint 14 (GCal)** jako prerequisite (`google_events` tabela). Sprawdzę czy istnieje.

## Plan Sprint 12 — Workspace AI recs + kalendarz tygodniowy

### Korekty względem MD
1. **GCal tabela**: MD zakłada `google_events` ze Sprintu 14 (nie zrealizowany). W projekcie istnieje `gcal_events` (z glosariusza). Użyję `gcal_events` jeśli ma kolumny `start_at/end_at/title`; zweryfikuję w trakcie. Jeśli brak — CalendarWidget fetchuje `tasks` z `due_date` w bieżącym tygodniu jako fallback + banner „GCal sync wymaga Sprint 14".
2. **pg_cron**: w Sprint 10 user świadomie odrzucił pg_cron. Trzymam się tej decyzji — **bez cron job**. Zamiast tego: endpoint `generate-daily-recs` wywoływany lazy on-read (gdy AIRecsWidget ładuje się i nie ma świeżych recs z dzisiaj → trigger generation). Snapshot `cron.job` z MD pomijam (nie ruszamy crona).
3. **Endpoint path**: MD sugeruje `sovra/generate-daily-recs` (subpath). Edge functions w Supabase nie mają subpathów — robię osobną funkcję `sovra-generate-daily-recs`.
4. **„Dopnij do notatki"** — reuse istniejącego mechanizmu z Sprint 11: INSERT do `workspace_notes` z tiptap doc zawierającym treść rekomendacji. Bez nowej edge fn — bezpośrednio z hooka `useCreateNote`.

### A. Migracja SQL `<ts>_sprint12_ai_recs.sql`
- `archive` schema bez snapshotu cron (pomijamy).
- `public.ai_recommendations` (id uuid PK, tenant_id, actor_id, scope text, title text, content text, action_url text NULL, status text CHECK in ('active','dismissed','pinned') DEFAULT 'active', created_at, dismissed_at NULL).
- Indeks `(actor_id, status, created_at DESC)`.
- RLS: SELECT/UPDATE/DELETE = `actor_id = get_current_director_id() AND tenant_id = get_current_tenant_id()`. INSERT przez edge fn (service role).
- Brak triggera, brak cron.
- `-- ROLLBACK: DROP TABLE public.ai_recommendations;`

### B. Edge Function `supabase/functions/sovra-generate-daily-recs/index.ts`
- POST `{ actor_id?: string }`. `requireAuth(req)` + jeśli brak actor_id → z auth.
- Zbiera kontekst (parallel queries):
  - tasks: `status='todo' AND due_date < now() AND owner_id=actor` (overdue)
  - deal_team_contacts: status active + last_activity > 14 days
  - contacts: bez interakcji 30+ dni (przez `last_contact_at` lub timeline)
  - meetings: `start_at BETWEEN tomorrow_start AND tomorrow_end`
- `callLLM` z `_shared/llm-provider.ts` (Gemini primary). Prompt PL: „Wygeneruj 3-5 rekomendacji…". Output JSON array `[{title, content, action_url?, scope}]`.
- Parsuje, INSERT batch do `ai_recommendations` z `actor_id`/`tenant_id`.
- Zwraca `{ generated: N }`. Logowanie do `ai_usage_log` (Sprint 10).
- CORS standard, rate-limit per user (`_shared/rateLimit.ts`).

### C. Frontend

**Hook nowy** `src/hooks/useAIRecommendations.ts`:
- `useAIRecommendations()` — fetch active recs + lazy trigger generate jeśli brak z dzisiaj.
- `useDismissRec(id)` — UPDATE status='dismissed', dismissed_at=now().
- `usePinRecToNote(rec)` — woła `useCreateNote` z tiptap doc `[h2:title, p:content, p:link?]`.

**Edycja `src/components/workspace/widgets/AIRecsWidget.tsx`**:
- Lista 3-5 kart: title + content (truncate), action_url (jeśli jest) jako link, 2 buttons: „Dopnij do notatki" / „Odrzuć".
- Loading: skeleton. Empty: „Sovra nie ma dziś rekomendacji" + button „Wygeneruj teraz".

**Edycja `src/components/workspace/widgets/CalendarWidget.tsx`**:
- Fetch `gcal_events` WHERE `start_at BETWEEN week_start AND week_end` AND owner_id (lub fallback na `tasks` z due_date).
- Grid 7 kolumn × 8:00-20:00 (12 wierszy h, 1h każdy). Eventy = absolutnie pozycjonowane kafelki (top = (start_h - 8) * 60px, height = duration_min).
- Klik → shadcn Dialog z detalami + button „Otwórz w GCal" (link `https://calendar.google.com/calendar/u/0/r/eventedit?...` lub `event.html_link` jeśli jest w tabeli).
- Localization PL (Sprint memory: weekStartsOn 1).

### D. Kolejność
1. Migracja SQL (ai_recommendations + RLS).
2. Edge fn `sovra-generate-daily-recs`.
3. Hook `useAIRecommendations`.
4. AIRecsWidget — pełna implementacja.
5. CalendarWidget — z fetch `gcal_events` (lub fallback tasks).
6. Smoke: AddWidgetMenu → ai_recs/calendar → render OK.

### E. DoD
- [ ] `ai_recommendations` z RLS.
- [ ] `sovra-generate-daily-recs` zwraca 3-5 wpisów po wywołaniu.
- [ ] AIRecsWidget renderuje recs, dismiss działa, pin tworzy `workspace_notes`.
- [ ] CalendarWidget renderuje tygodniowy grid z eventami.
- [ ] Brak pg_cron (lazy generate on-read).

### F. Ryzyka
- **R1** `gcal_events` schema: jeśli brak `start_at` → użyję faktycznych nazw kolumn po sprawdzeniu w migracji (prawdopodobnie `start_time`/`end_time`).
- **R2** Lazy generate przy każdym wejściu może spam-ować LLM. Mitygacja: check `EXISTS (SELECT 1 FROM ai_recommendations WHERE actor_id=X AND created_at > today_start)` przed generate.
- **R3** Sprint 14 nie zrobiony → CalendarWidget pokaże tylko tasks. Akceptowalne dla MVP — banner informacyjny.
- **R4** Bug create_task — uznaję za zamknięty (fix wdrożony, user anulował dalszą diagnozę). Jeśli wraca → osobny ticket.
