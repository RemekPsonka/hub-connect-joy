

# Sprint 04 — Sovra 2.0 fundament (zaadaptowany do realiów)

## Decyzje (potwierdzone)
- D1: DROP tylko 7 tabel martwych person: `agent_conversations`, `remek_conversations`, `remek_knowledge_base`, `master_agent_queries`, `turbo_agent_sessions`, `turbo_agent_sub_queries`, `sovra_report_config`. ZOSTAJĄ: `sovra_sessions`, `sovra_reminders`, `consultation_chat_messages`, `contact_agent_memory`, `master_agent_memory`.
- D2: Adaptacja istniejącego Sovra UI — `useSovraChat` przepięty na nowy edge fn `sovra` + `ai_conversations/ai_messages`. Zero nowych komponentów. Tryby Debrief/Morning/Suggestions zostają na obecnym schemacie.
- D3: DELETE Remek/AIChat/IntentClassifier (FE + BE). ZOSTAW useContactAgent + useTurboAgent (feature karty kontaktu, konsolidacja w S06).
- D4: LLM tylko Lovable AI Gateway (Gemini), bez Claude/OpenAI fallback w S04. Cost calc inline (do `ai_usage_log` w S10).

## Stan w bazie (zweryfikowany)
- `tenants` + `get_current_tenant_id/director_id` istnieją (FK + RLS gotowe)
- `vector` extension OK (1536 dla embeddings)
- Counts do archiwizacji: agent_conversations=8, remek_conversations=9, remek_knowledge_base=20, master_agent_queries=16, turbo_agent_sessions=2, turbo_agent_sub_queries=0, sovra_report_config=0

## Zakres

### A. Migracja `supabase/migrations/<ts>_sprint04_sovra2_schema.sql`

```sql
CREATE SCHEMA IF NOT EXISTS archive;

-- 1. ARCHIWIZACJA 7 tabel
CREATE TABLE archive.agent_conversations_backup_20260418 AS SELECT * FROM public.agent_conversations;
CREATE TABLE archive.remek_conversations_backup_20260418 AS SELECT * FROM public.remek_conversations;
CREATE TABLE archive.remek_knowledge_base_backup_20260418 AS SELECT * FROM public.remek_knowledge_base;
CREATE TABLE archive.master_agent_queries_backup_20260418 AS SELECT * FROM public.master_agent_queries;
CREATE TABLE archive.turbo_agent_sessions_backup_20260418 AS SELECT * FROM public.turbo_agent_sessions;
CREATE TABLE archive.turbo_agent_sub_queries_backup_20260418 AS SELECT * FROM public.turbo_agent_sub_queries;
CREATE TABLE archive.sovra_report_config_backup_20260418 AS SELECT * FROM public.sovra_report_config;

-- 2. RAISE NOTICE z liczbą wierszy
DO $$ ... LOOP RAISE NOTICE ... END $$;

-- 3. DROP 7 tabel CASCADE
DROP TABLE IF EXISTS public.turbo_agent_sub_queries CASCADE;
DROP TABLE IF EXISTS public.turbo_agent_sessions CASCADE;
DROP TABLE IF EXISTS public.master_agent_queries CASCADE;
DROP TABLE IF EXISTS public.agent_conversations CASCADE;
DROP TABLE IF EXISTS public.remek_conversations CASCADE;
DROP TABLE IF EXISTS public.remek_knowledge_base CASCADE;
DROP TABLE IF EXISTS public.sovra_report_config CASCADE;

-- 4. NOWE: ai_conversations / ai_messages / ai_memory (zgodnie ze sprintem, tylko z naszym FK na tenants/directors)
CREATE TABLE public.ai_conversations (
  id uuid PK, tenant_id FK→tenants, actor_id FK→directors,
  persona text DEFAULT 'sovra', scope_type text, scope_id uuid,
  title text, started_at, last_message_at, metadata jsonb
);
CREATE TABLE public.ai_messages (
  id, conversation_id FK→ai_conversations, role CHECK ('user|assistant|tool|system'),
  content text, tool_calls jsonb, tool_results jsonb,
  model, provider, tokens_in, tokens_out, cost_cents, created_at
);
CREATE TABLE public.ai_memory (
  id, tenant_id FK→tenants, scope_type, scope_id, memory_type,
  content text, embedding vector(1536), created_by, created_at, updated_at
);
-- Indeksy + RLS po tenant_id/actor_id zgodnie ze sprintem.

-- ROLLBACK w komentarzu (DROP 3 nowych + restore z archive).
```

### B. Edge functions

**Nowy:** `supabase/functions/sovra/index.ts`
- POST `{conversation_id?, message, scope_type?, scope_id?}`
- Auth: walidacja JWT z `_shared/auth.ts` (już istnieje, nie tworzymy nowego)
- Rate limit: `_shared/rateLimit.ts` (Upstash, już używane), 30 req/60s per user
- Flow: insert/select conversation → insert user message → fetch ostatnie 20 messages + ai_memory dla scope → callLLM streaming → po [DONE] insert assistant message + UPDATE last_message_at
- SSE response (token-by-token wg AI Gateway docs)

**Nowy:** `supabase/functions/_shared/llm-provider.ts`
- `callLLM({messages, model_hint?})` → strumień SSE z Lovable AI Gateway
- Domyślny model: `google/gemini-3-flash-preview`
- Inline cost table (Gemini Flash: ~0.0125¢/1k in, ~0.05¢/1k out)
- console.log JSON: `{provider:"lovable", model, tokens_in, tokens_out, cost_cents, latency_ms, request_id}`
- Bez Claude/OpenAI fallback (S05)

**Nowy:** `supabase/functions/_shared/prompts/sovra.v1.ts`
- `SOVRA_SYSTEM_PROMPT_V1` po polsku (asystentka Remka, CRM Moj+SGU, ciepły+konkretny styl)
- `buildSovraPrompt(scope_type?, scope_context?)` dolepia kontekst per kontakt/projekt/deal/global

**DELETE (kod + `delete_edge_functions`):**
- `ai-chat`, `ai-chat-router`, `remek-chat`
- `master-agent-query`, `turbo-agent-query`, `query-contact-agent` — **NIE, ZOSTAJĄ** (D3, używane przez useContactAgent/useTurboAgent)
- `sovra-chat` — DELETE (zastępuje go nowy `sovra`)
- `sovra-morning-session`, `sovra-debrief`, `sovra-weekly-report`, `sovra-suggest-contacts`, `sovra-generate-embeddings`, `sovra-reminder-trigger`, `consultation-chat` — **ZOSTAJĄ** (D1: feature, nie persona)

Finalna lista do skasowania (4): `ai-chat`, `ai-chat-router`, `remek-chat`, `sovra-chat`.

### C. Frontend

**Adaptacja `src/hooks/useSovraChat.ts`:**
- Zmiana endpointu: `/functions/v1/sovra-chat` → `/functions/v1/sovra`
- Body: `{conversation_id, message, scope_type, scope_id}` zamiast obecnego shape
- `loadSession(id)` → SELECT z `ai_messages WHERE conversation_id=id`
- `newSession()` → reset `conversationId=null` (backend zrobi insert)
- Stream parsing wg wzoru z dokumentacji AI Gateway

**Adaptacja `src/hooks/useSovraSessions.ts`:**
- Query z `ai_conversations` zamiast `sovra_sessions`, kolumny mapowane: `started_at`, `last_message_at`, `title`

**Adaptacja `src/components/sovra/SovraSidebar.tsx`:**
- Renderuje nowy shape z ai_conversations (bez zmian wizualnych)

**DELETE (FE):**
- `src/pages/AIChat.tsx`
- `src/hooks/useAIChat.ts`, `useRemekChat.ts`, `useIntentClassifier.ts`
- `src/components/remek/RemekChatWidget.tsx` (+ cały folder `remek/` jeśli pusty)
- `src/contexts/RemekWidgetContext.tsx`

**Edycja `src/App.tsx`:**
- Usuń `AIChat` lazy + route `/ai`
- Usuń `RemekWidgetProvider` wrapper
- `/sovra` zostaje bez zmian

**Edycja `src/components/layout/AppLayout.tsx`:**
- Usuń `RemekChatWidget` import + użycie
- Usuń import `RemekChatWidget`

**Sidebar nav:**
- Usuń link do `/ai` (jeśli jest w `AppSidebar.tsx`)

### D. Konfiguracja
- `supabase/config.toml`: usuń bloki dla 4 funkcji do skasowania (jeśli istnieją). Sprawdzę przed edycją.
- `verify_jwt`: nowa `sovra` bez bloku (default). Wewnątrz: walidacja JWT przez `_shared/auth.ts`.

## Kolejność wykonania
1. Migracja SQL (archive → RAISE → DROP 7 → CREATE 3 + RLS)
2. Edge fn `_shared/llm-provider.ts` + `_shared/prompts/sovra.v1.ts` + `sovra/index.ts`
3. DELETE 4 edge fns (kod + `delete_edge_functions`)
4. Adaptacja `useSovraChat`, `useSovraSessions`, `SovraSidebar`
5. DELETE FE (AIChat, Remek*, IntentClassifier, RemekWidgetProvider)
6. Edycja `App.tsx`, `AppLayout.tsx`, `AppSidebar.tsx`
7. Build + smoke test `/sovra` (wpisz "cześć" → odpowiedź; refresh → historia)

## Definition of Done
- [ ] 7 tabel zarchiwizowane + zdropowane
- [ ] `ai_conversations/ai_messages/ai_memory` z RLS po tenant+actor
- [ ] `/sovra` działa: streaming odpowiedzi, persistencja w `ai_messages`
- [ ] Brak edge fns: `ai-chat`, `ai-chat-router`, `remek-chat`, `sovra-chat`
- [ ] Brak FE: AIChat, RemekChatWidget, RemekWidgetProvider, useAIChat/useRemekChat/useIntentClassifier
- [ ] Tryby Debrief/Morning/Suggestions/Reminders nadal działają (osobny schemat)
- [ ] useContactAgent/useTurboAgent nadal działają (D3)

## Ryzyka
- **R1: Migracja UI Sovry** — `useSovraChat` ma load/new/stream. Adaptacja wymaga ostrożnego mapowania state. Test: refresh strony → historia musi się załadować.
- **R2: RemekWidgetContext** — sprawdzę czy nie jest używany poza widgetem (np. global state). Jeśli tak — wycofuję jego deletion z S04.
- **R3: cost_cents inline** — pricing Gemini może się zmienić; oznaczę TODO+S10.
- **R4: `consultation_chat_messages`** — sprint mówił DROP, my zostawiamy. Ryzyko: review-er sprintu może się zdziwić. Odnotujemy w changelog.
- **R5: Runtime error "Cannot read properties of undefined (reading 'summary')"** — niezwiązany ze sprintem (prawdopodobnie Dashboard). Sprawdzę i poprawię cicho jeśli to trywialne.

