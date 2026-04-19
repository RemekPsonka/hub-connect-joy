
Sprint 19a — 3 sekcje. Sprawdzę stan kodu, potem plan.

**A. RLS ai_usage_log** — migracja jak w spec. Bezpieczna.

**B. BI dead code** — sprawdzę co istnieje i kto importuje.

**C. Triple LLM fallback** — rozbudowa `_shared/llm-provider.ts`. ANTHROPIC_API_KEY/OPENAI_API_KEY będę musiał potwierdzić przez add_secret jeśli brak — ale spec mówi "fail-silent gdy brak klucza", więc kod ma działać bez nich. Dopytanie nie jest blokerem.

## Plan

### A. Migracja RLS — `supabase/migrations/<ts>_sprint19a_ai_usage_log_rls.sql`
Snapshot policy → DROP wszystkich INSERT policy → CREATE 2 nowe (`ai_usage_log_insert_auth` dla `authenticated` z gate `tenant_id = get_current_tenant_id()`, `ai_usage_log_insert_service` dla `service_role` z `(true)`). `ENABLE RLS` na końcu.

### B. Kasacja BI 1.0 dead code
Sprawdzę:
- listing `src/hooks/useBusinessInterview.ts`, `useBIInterview.ts`, `src/components/bi/`, `src/components/agents/BI*.tsx`
- grep wszystkich importów tych symboli
- co `src/components/bi/types.ts` eksportuje vs co używa `ContactBI.tsx` + `useContactBI.ts`

Kasuję pliki listowane w spec. Folder `sections/` cały. Zostawiam tylko `ContactBI.tsx`, `useContactBI.ts`, `index.ts` (po czyszczeniu eksportów), `types.ts` (po przefiltrowaniu — tylko `BIAnswers` używane w ContactBI; ale ContactBI importuje z `@/lib/bi/questions.v2` więc `types.ts` może być w pełni do skasowania jeśli nikt go nie używa).

Naprawiam broken imports w pozostałych plikach (ContactDetail, ewentualne inne strony). Raportuję osobnym bulletem co było używane w routingu.

### C. Triple LLM fallback w `supabase/functions/_shared/llm-provider.ts`

Rozbudowa:
1. **`logUsage`** — dodaj parametr `metadata?: Record<string, unknown>`, przekaż do `persistUsage` → `metadata` JSONB w insert.
2. **`callAnthropic(opts, model)`** — fetch `https://api.anthropic.com/v1/messages`, header `x-api-key` + `anthropic-version: 2023-06-01`. Mapowanie messages: rola `system` → top-level `system: string`, reszta → `messages[]`. Model map: `*flash*` → `claude-3-5-haiku-latest`, `*pro*` → `claude-3-5-sonnet-latest`. Tokens z `usage.input_tokens` / `usage.output_tokens`. Pricing dopisz dla claude.
3. **`callOpenAI(opts, model)`** — POST `https://api.openai.com/v1/chat/completions`, Bearer. Map: `*flash*` → `gpt-4o-mini`, `*pro*` → `gpt-4o`. Format messages identyczny z Lovable Gateway.
4. **`callLLM`** rebuild:
   - try Lovable Gateway (jak dziś)
   - jeśli `stream: true` i fail → log + return `{status: 503, model}`. TODO comment dla streaming fallback.
   - jeśli `stream: false`:
     - status w `{429, 500, 502, 503, 504}` lub `!ok` lub throw → fallback chain
     - try Anthropic (jeśli klucz; brak → log `error: missing_api_key_anthropic` + skip)
     - try OpenAI (jeśli klucz; brak → log + skip)
     - wszystkie failed → log `error: all_providers_failed` + return `{status: 503, model: 'none'}`
   - każda próba (sukces+fail) → `logUsage` z `metadata: { fallback_reason, attempt }`

### Pytanie/uwaga

ANTHROPIC_API_KEY i OPENAI_API_KEY mogą nie być ustawione w secrets. Spec mówi fail-silent — kod nie crashuje, tylko loguje skip. Po wdrożeniu powiem userowi że jeśli chce mieć działający fallback, musi dorzucić te 2 klucze przez Lovable Cloud secrets (osobny krok, nie blokuje sprintu).

### Kolejność wykonania
1. `code--exec` — listing BI plików + grep importów (potrzebne do sekcji B)
2. Migracja A (write file)
3. Kasacja B (delete files + fix imports)
4. Refaktor C (`llm-provider.ts`)
5. `npm run lint` + `tsc --noEmit` w jednym tle
6. Raport końcowy z bulletem o ContactDetail/routingu

Brak zmian w `ContactBI.tsx`/`useContactBI.ts`. Brak DROP tabel. Brak zmian w streaming code path Sovry.
