
## Sprint SGU-07 — Prospecting web scraping + Case D activation

### Recon (READ-ONLY, równolegle)

**Round 1 — 6 calls równolegle:**
1. `supabase--read_query` × 5:
   - `sgu_prospecting_candidates` kolumny (potwierdzenie wdrożenia SGU-06: `source`, `source_job_id`, `candidate_data`/`name`, `status`, `ai_score`).
   - `pg_proc` SGU prospecting functions (`sgu_next_prospecting_job`, `sgu_enqueue_prospecting_job` — albo brak).
   - `cron.job` lista SGU jobów (czy `sgu_web_prospecting_*` nie istnieje).
   - Trigger `tr_calculate_commission_entries_for_payment` — `pg_get_triggerdef` (potwierdzenie SGU-03 wdrożone).
   - `background_jobs` FK constraints (`actor_id` FK target — directors czy auth.users; po SGU-06 powinno być `actor_user_id` jako alternatywa).
2. `code--view supabase/functions/sgu-prospecting-krs-worker/index.ts` — wzorzec workera (lock, drain, AI scoring, finalize).
3. `code--view supabase/functions/sgu-prospecting-krs/index.ts` — wzorzec enqueue (auth, quota, INSERT background_jobs).

**Round 2 (zależnie od round 1):**
- `supabase--read_query` — `pg_get_functiondef` dla `fn_calculate_commission_entries_for_payment` (KLUCZOWE — pełne body do CREATE OR REPLACE z dodaniem Case D bez ruszania A/B/C).
- `supabase--read_query` — `sgu_settings` kolumny (potwierdzenie istnienia tabeli, czy `case_d_confirmed` już nie istnieje).
- `code--view src/components/deals-team/ProspectingTab.tsx` (po SGU-06 z `AIKRSPanel`) — punkt wpięcia nowego taba `ai-web`.
- `code--view src/components/sgu/AIKRSPanel.tsx` — wzorzec dla `AIWebPanel`.
- `code--view src/components/layout/SGUSidebar.tsx` — gdzie dodać link „Case D" w grupie Admin.
- `code--view src/App.tsx` — punkt wpięcia route `/sgu/admin/commissions/case-d`.

**Wypisuję 8-pkt status.** Jeśli SGU-06 lub trigger SGU-03 nie wdrożony → STOP + report.

### Implementacja (po reconie, batch po częściach)

## CZĘŚĆ A — WEB PROSPECTING

**A.1 Migracja SQL** `supabase/migrations/<ts>_sgu_07_web_prospecting.sql`:
1. Archive snapshot `sgu_prospecting_candidates`.
2. CREATE TABLE `sgu_web_sources`:
   - `id`, `tenant_id`, `name`, `url`, `source_type` ('rss'|'html'|'api'), `parser_config jsonb`, `keywords text[]`, `is_active boolean DEFAULT true`, `last_run_at`, `last_status`, `last_error`, `created_by_user_id`, `created_at`.
3. RLS enable + 4 policies (partner+director+superadmin SELECT/INSERT/UPDATE/DELETE; tenant scope).
4. CREATE TABLE `sgu_web_source_runs` (audit log: source_id, started_at, finished_at, items_found, candidates_added, status, error).
5. Indexy: `(tenant_id, is_active)`, `(source_id, started_at DESC)`.
6. RPC `sgu_next_web_source_to_run()` SECURITY DEFINER — zwraca 1 source ready (active AND last_run_at < now() - interval '6 hours') z FOR UPDATE SKIP LOCKED.

**A.2 pg_cron** (przez **insert tool**, nie migracja):
```sql
cron.schedule('sgu_web_prospecting_tick', '*/15 * * * *',
  $$SELECT public.schedule_edge_function('sgu-prospecting-web-worker', '{}'::jsonb);$$);
```

**A.3 Edge functions:**
- `sgu-prospecting-web/index.ts` — manualny enqueue (FE button „Uruchom teraz" per source). POST `{ source_id }` → INSERT `background_jobs(job_type='sgu_web_prospecting', payload={source_id}, status='pending')`. Reuse pattern z `sgu-prospecting-krs`.
- `sgu-prospecting-web-worker/index.ts` — cron drain. Reuse `sgu-prospecting-krs-worker` jako szkielet:
  - `x-cron-secret` check.
  - Pobierz 1 pending job (`sgu_next_prospecting_job` rozszerzony o `job_type='sgu_web_prospecting'` — **lub** dodaj nowy RPC `sgu_next_web_prospecting_job`).
  - Parse source_id → SELECT `sgu_web_sources`.
  - **Fetch + parse** zależnie od `source_type`:
    - `rss`: `npm:fast-xml-parser@4` (lekki, działa w Deno).
    - `html`: `npm:linkedom@0.16` (DOM parsing) + selektory z `parser_config.selectors`.
    - `api`: fetch z `parser_config.headers`.
  - Dla każdego item (max 30/tick): keyword filter → AI classify (LLM provider, prompt PL: „Czy to firma/osoba potencjalna na klienta agencji ubezpieczeniowej? Zwróć JSON {is_lead:bool, score:0-100, reasoning, extracted:{name,phone?,email?}}"). Jeśli `is_lead && score >= 30` → INSERT `sgu_prospecting_candidates(source='web', source_job_id, name=extracted.name, ai_score, ai_reasoning, ai_model, candidate_data=raw item)`.
  - INSERT `sgu_web_source_runs` na koniec.
  - UPDATE `sgu_web_sources.last_run_at`, `last_status`, `last_error`.
  - Finalize `background_jobs` jak w SGU-06.

**A.4 Hooki:**
- `useSGUWebSources.ts` — query + create/update/delete/triggerNow mutations.
- `useSGUWebCandidates.ts` — wrapper na `useProspectingCandidates({ source: 'web' })`.

**A.5 Komponenty:**
- `WebSourcesTable.tsx` — `<Table>` z kolumnami: nazwa, URL, typ, last_run_at, last_status, ✓/✗, akcje (Edit / Delete / Uruchom teraz / Toggle active).
- `WebSourceDialog.tsx` — RHF + Zod (`name` min 2, `url` URL, `source_type` enum, `keywords` chips, `parser_config` JSON textarea z domyślnym szablonem per typ).
- `AIWebPanel.tsx` — wrapper analogiczny do `AIKRSPanel`: `<WebSourcesTable>` na górze + `<ProspectingCandidatesList source='web'>` poniżej (sortowane po ai_score DESC).

**A.6 Modyfikacje:**
- `src/components/deals-team/ProspectingTab.tsx` — dodaj `<TabsTrigger value='ai-web'>AI Web</TabsTrigger>` obok `ai-krs` + `<TabsContent value='ai-web'><AIWebPanel/></TabsContent>`. Tab widoczny TYLKO dla `is_sgu_partner() || directorId`.

## CZĘŚĆ B — CASE D ACTIVATION

**B.1 Migracja SQL** `supabase/migrations/<ts>_sgu_07_case_d_activation.sql`:
1. Archive snapshot `sgu_settings` + `commission_entries` (tylko schema/struktura — dane v1 zostają nietknięte).
2. ALTER TABLE `sgu_settings`:
   - ADD COLUMN `case_d_confirmed boolean NOT NULL DEFAULT false`
   - ADD COLUMN `case_d_confirmed_at timestamptz`
   - ADD COLUMN `case_d_confirmed_by_user_id uuid REFERENCES auth.users(id)`.
3. CREATE OR REPLACE FUNCTION `fn_calculate_commission_entries_for_payment()` — **WAŻNE**: kopia całego body z SGU-03 (z reconu), z dodaniem nowej gałęzi Case D **bez ruszania A/B/C**:
   ```
   IF policy.has_handling = true AND policy.representative_user_id IS NOT NULL THEN
     -- Case D
     SELECT case_d_confirmed INTO v_confirmed FROM sgu_settings WHERE tenant_id = policy.tenant_id;
     IF NOT v_confirmed THEN
       RAISE EXCEPTION '[SGU commission] Edge Case D — awaiting Remek confirmation (sgu_settings.case_d_confirmed=false). Activate at /sgu/admin/commissions/case-d';
     END IF;
     -- Subcase rep_first_then_handling:
     -- Base = payment.amount × policy.commission_rate
     -- Rep 10% of base
     -- Handling 9% of base (modyfikator po rep)
     -- Pozostałe 81% × split (sgu 30 / adam 35 / paweł 17.5 / remek 17.5):
     --   SGU = 81% × 30% = 24.30%
     --   Adam = 81% × 35% = 28.35%
     --   Paweł = 81% × 17.5% = 14.175%
     --   Remek = 81% × 17.5% = 14.175%
     -- Suma kontrolna = 10 + 9 + 24.30 + 28.35 + 14.175 + 14.175 = 100% ✓
     -- INSERT 6 wpisów z algorithm_version='v2-case-d', calculation_log={case:'D', case_d_subcase:'rep_first_then_handling', base_gr, rep_pct:10, handling_pct:9, residual_pct:81, split:{...}}
     -- Korekta zaokrąglenia: różnicę przypisać do ostatniego wpisu (Remek).
   ELSE
     -- Case A/B/C — bez zmian z SGU-03 (skopiowane 1:1 z reconu)
   END IF;
   ```
4. Trigger `tr_calculate_commission_entries_for_payment` **NIE jest dropowany** — działa dalej na zaktualizowanej funkcji (CREATE OR REPLACE FUNCTION zachowuje binding triggera).

**B.2 FE:**
- `useCaseDStatus.ts` — query `sgu_settings.case_d_confirmed` + mutation `confirm()` (UPDATE z `case_d_confirmed=true, case_d_confirmed_at=now(), case_d_confirmed_by_user_id=auth.uid()`).
- `CaseDPreviewTable.tsx` — TS-only kalkulator: input `policy_amount_pln` + `commission_rate_pct` → wyświetla 6 wierszy z procentami i kwotami. Bez wywołań DB.
- `SGUCaseD.tsx` — strona admin: nagłówek „Case D — rep + handling", opis algorytmu, `<CaseDPreviewTable>`, status badge (potwierdzony/oczekujący), button „Potwierdzam aktywację Case D" (z AlertDialog confirm). Po potwierdzeniu — disabled + info „Aktywowano przez X dnia Y".
- `App.tsx` — dodaj `<Route path="/sgu/admin/commissions/case-d" element={<SGUCaseD/>}/>` w drzewie SGU (z `AdminGuard`).
- `SGUSidebar.tsx` — link „Case D" w grupie `adminItems` (`/sgu/admin/commissions/case-d`, ikona `Receipt` lub `Calculator`), widoczny dla `isAdmin || isSuperadmin`.

**B.3 Smoke test (wg specu):**
1. Pre-aktywacja: UPDATE polisy + raty → ERROR z fn_calculate (transakcja rollback, `is_paid` zostaje false).
2. Aktywacja przez UI lub SQL.
3. Post-aktywacja: UPDATE rata → 6 wpisów `commission_entries` z `algorithm_version='v2-case-d'`, suma 200.00 PLN.

**B.4 Walidacja:**
- types.ts auto-regen.
- Deploy 2 edge fns (`sgu-prospecting-web`, `sgu-prospecting-web-worker`).
- `npm run build` + `npm run lint`.

### Pliki

**Nowe (12):**
- `supabase/migrations/<ts>_sgu_07_web_prospecting.sql`
- `supabase/migrations/<ts>_sgu_07_case_d_activation.sql`
- `supabase/functions/sgu-prospecting-web/index.ts`
- `supabase/functions/sgu-prospecting-web-worker/index.ts`
- `src/hooks/useSGUWebSources.ts`
- `src/hooks/useSGUWebCandidates.ts`
- `src/hooks/useCaseDStatus.ts`
- `src/components/sgu/WebSourcesTable.tsx`
- `src/components/sgu/WebSourceDialog.tsx`
- `src/components/sgu/AIWebPanel.tsx`
- `src/components/sgu/CaseDPreviewTable.tsx`
- `src/pages/sgu/SGUCaseD.tsx`

**Modyfikowane (3):**
- `src/components/deals-team/ProspectingTab.tsx` (dodanie taba `ai-web`)
- `src/App.tsx` (route Case D)
- `src/components/layout/SGUSidebar.tsx` (link Case D w grupie Admin)

### Ryzyka / decyzje

- **fn_calculate_commission_entries_for_payment body**: KLUCZOWY recon — muszę przeczytać pełne body z SGU-03 i wkleić CALE wraz z dodaną gałęzią D. Ryzyko regression na A/B/C jeśli przeoczę szczegół. Mitigation: diff przed/po + smoke z istniejącymi v1 wpisami (żaden nie powinien się zmienić, bo trigger nie re-procesuje historycznych is_paid=true).
- **Dependencje Deno worker**: `npm:fast-xml-parser@4` (RSS) i `npm:linkedom@0.16` (HTML). Lekkie, działają w Deno. Jeśli problem z deploy → fallback do `npm:cheerio@1.0.0-rc.12` lub manualnego regex parse dla MVP.
- **Worker dla web vs krs**: dwa osobne workery (different cron tick + different parse logic). Dzielą wzorzec lock/finalize, ale parse layer jest różny. Nie konsoliduję — komplikacja per source_type byłaby gorsza.
- **Rate limit web fetching**: sleep 2s między item fetches; max 30 items/tick. Dla 5 źródeł × 30 items = 150 candidates per 15-min tick = 600/h. OK.
- **AI cost**: 30 items × 5 sources = 150 LLM calls per 15-min tick. Reuse `_shared/llm-provider.ts` (Gemini default, tani). Daily ~14 400 calls — w granicach budżetu.
- **`sgu_next_prospecting_job` reuse vs new**: dodam parametr `p_job_type text DEFAULT 'sgu_krs_prospecting'` żeby worker web mógł reuse'ować ten sam RPC. Mniej duplikacji.
- **Case D korekta zaokrąglenia**: różnica gr (max ±5 gr) trafia do ostatniego wpisu (Remek). Komentarz w `calculation_log.rounding_adjustment_gr`.
- **Brak seedów źródeł web**: zgodnie ze specem — Remek dodaje manualnie. UI z polem `parser_config` JSON pozwala mu skonfigurować RSS/HTML selektory bez deployu kodu.

### Raport końcowy
1. Lista nowych + modyfikowanych plików (absolute paths).
2. Status 2 migracji + insert pg_cron + 2 edge fns deploy.
3. Wyniki 8-pkt reconu (zwłaszcza pełne body fn_calculate przed zmianą).
4. Smoke web: dodać 1 test RSS source (np. Polska Agencja Prasowa biznes) → kliknąć „Uruchom teraz" → po 1-2 min ≥1 candidate w `sgu_prospecting_candidates` z `source='web'`.
5. Smoke Case D: 3-step (pre-aktywacja ERROR → aktywacja UI → post-aktywacja 6 wpisów z sumą 200.00 PLN, algorithm_version='v2-case-d').
6. `npm run build` + `npm run lint`.
7. Diff body fn_calculate (linie zmienione).

Po Twojej akceptacji: recon (8 calls) → Część A (migracja + edge fns + FE) → Część B (migracja + FE) → deploy + smoke → raport.
