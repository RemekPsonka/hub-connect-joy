

# Sprint 10 — Observability (zaadaptowany, bez pg_cron)

## Korekty względem sprint MD
- **pg_cron pominięty** (decyzja użytkownika). Triggery `trg_refresh_dash_*` zostają — żadnych DROP-ów, żadnego cron.schedule. Cleanup `sovra_pending_actions.expired` przeniesiony do `_shared/sovra-tools.ts` lub edge fn `sovra` (lazy expire on read).
- **Sentry**: FE (`@sentry/react`) + lekki custom `_shared/sentry.ts` w edge fn (fetch do DSN, bez SDK npm). DSN-y jako secrets — poproszę po akceptacji planu (`VITE_SENTRY_DSN` build-secret + `SENTRY_DSN_EDGE` runtime).
- **`ai_usage_log`**: zostaje partycjonowany miesięcznie (Apr 2026 → Jan 2027), zgodnie z MD.
- **RLS**: `is_superadmin()` istnieje, `get_current_director_id()` istnieje — RPC i policy bezpieczne.

## A. Migracja SQL `supabase/migrations/<ts>_sprint10_ai_usage_log.sql`
1. `archive` schema check.
2. `CREATE TABLE public.ai_usage_log` partycjonowany po `created_at` + 9 partycji miesięcznych (2026_04..2026_12) + `2027_01`.
3. Indeksy: `(function_name, created_at DESC)`, `(created_at DESC)`, `(actor_id, created_at DESC)`.
4. RLS: SELECT dla superadmin lub własny actor; INSERT `WITH CHECK (true)` (service_role bypass i tak).
5. RPC `rpc_ai_cost_summary(p_days_back int default 30)` → `(day, function_name, provider, total_cost_cents, total_tokens)`. SQL STABLE SECURITY INVOKER, `SET search_path=public`.
6. Komentarz `-- ROLLBACK:` z DROP table+RPC.

## B. Edge Functions
- **`_shared/llm-provider.ts`** — po każdym call (success + error) INSERT do `public.ai_usage_log` przez service_role client. Nowy parametr `CallLLMOptions.context?: { function_name, persona?, actor_id?, tenant_id? }`. Failure INSERT-u → `console.error`, nie blokuje response.
- **`_shared/sentry.ts`** (nowy) — `captureException(err, context?)`: jeśli `SENTRY_DSN_EDGE` ustawiony → POST event do Sentry ingest endpoint (parsowanie DSN do `https://oXXX.ingest.sentry.io/api/PROJECT/store/`). Jeśli brak DSN → no-op.
- **`sovra/index.ts` + `sovra-confirm/index.ts` + inne kluczowe fn** — w `catch` wołać `captureException(err, { function_name })`. Aktualizacja `callLLM` call-sites o `context`.
- **Lazy expire pending** — w `sovra/index.ts` na początku handlera: `UPDATE sovra_pending_actions SET status='expired' WHERE status='pending' AND expires_at < now() AND tenant_id = current_tenant`. Tanio i nie wymaga crona.

## C. Frontend
- **Dependency**: `@sentry/react`.
- **`src/main.tsx`**: `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, tracesSampleRate: 0.1, environment: import.meta.env.MODE })` jeśli DSN ustawiony; owinięcie `<App/>` w `<Sentry.ErrorBoundary fallback={<ErrorBoundary>}>` (zachowując istniejący `ErrorBoundary` jako children fallback).
- **`src/pages/owner/AICosts.tsx`** (nowy) — tabela + bar chart (recharts, już w stacku). Wykres: oś X = day, Y = sum cost_cents (PLN po `/100` jeśli grosze; tu USD cents — pokażę `$X.XX`), grupy = function_name. Tabela poniżej: function/provider/tokens/cost. Filtr dni (7/30/90).
- **`src/hooks/useAICostSummary.ts`** — wywołanie `supabase.rpc('rpc_ai_cost_summary', { p_days_back: days })`.
- **`src/App.tsx`**: dodać `lazy(() => import('./pages/owner/AICosts'))` + `<Route path="/owner/ai-costs" element={<DirectorGuard><AICosts/></DirectorGuard>} />`.
- **`src/components/layout/AppSidebar.tsx`**: w bloku admin (linia ~250) dodać item „Koszty AI" → `/owner/ai-costs`, ikona `DollarSign`.

## D. Sekrety (dodane po akceptacji)
- `VITE_SENTRY_DSN` — **build secret** (workspace settings, użytkownik wkleja ręcznie).
- `SENTRY_DSN_EDGE` — runtime secret (przez `add_secret`).

## E. Kolejność wykonania
1. Migracja SQL (`ai_usage_log` + RPC + RLS).
2. `_shared/sentry.ts` + update `_shared/llm-provider.ts` (INSERT do ai_usage_log).
3. Lazy expire w `sovra/index.ts` + `captureException` w catch sovra/sovra-confirm.
4. FE: `npm i @sentry/react`, `main.tsx`, `useAICostSummary`, `AICosts.tsx`, route, sidebar.
5. Poprosić usera o `SENTRY_DSN_EDGE` (runtime) + instrukcję dla `VITE_SENTRY_DSN` (build-secret).

## F. DoD
- [ ] `ai_usage_log` istnieje z 9 partycjami + RLS + RPC.
- [ ] Po wywołaniu Sovry: `SELECT COUNT(*) FROM ai_usage_log WHERE created_at > now() - interval '5 min'` ≥ 1.
- [ ] `/owner/ai-costs` renderuje wykres (recharts) + tabelę.
- [ ] Sidebar admin ma „Koszty AI".
- [ ] FE Sentry init: gdy `VITE_SENTRY_DSN` puste → no-op (brak crashy).
- [ ] Edge Sentry: `captureException` wywoływany w catch `sovra` + `sovra-confirm`.
- [ ] Brak DROP trigger MV. Brak `cron.schedule`. `sovra_pending_actions` expirowane lazy.

## G. Ryzyka
- **R1** Brak `pg_cron` → MV refresh nadal triggerami (overhead OLTP zostaje, do Sprintu 10b jak Remek włączy Pro).
- **R2** Lazy expire `sovra_pending_actions` działa tylko gdy ktoś woła Sovrę. Akceptowalne — pending actions per user, niski wolumen.
- **R3** Sentry edge bez SDK = brak breadcrumbs/release tracking. Wystarczy do MVP error monitoring.
- **R4** `cost_cents` jako `int` — przy pricing 0.0125 cents/1k tokens małe wartości zaokrąglane do 0. Poprawiam w llm-provider: store jako `numeric(10,4)` lub mnożnik ×10000 (mikrocenty). **Decyzja: zmieniam typ kolumny na `numeric(12,4)`** żeby zachować precyzję małych wywołań.

