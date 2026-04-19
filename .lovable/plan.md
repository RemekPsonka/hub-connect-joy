
## Sprint SGU-06 — Prospecting AI KRS

### Recon (READ-ONLY, równolegle przed implementacją)

**Round 1 — 9 calls równolegle:**
1. `supabase--read_query` × 6:
   - `background_jobs` kolumny + constraints (KLUCZOWE: czy `actor_id` NOT NULL → decyzja o ALTER DROP NOT NULL).
   - Paweł/Adam: czy mają row w `directors` (decyduje wariant a/b dla actor_id).
   - Distinct `job_type` w `background_jobs` (kolizja z `'sgu_krs_prospecting'`?).
   - Czy `pkd_codes`/`pkd_codes_seed` już istnieje.
   - `cron.job` lista (czy `sgu_prospecting_krs_worker_tick` nie istnieje).
   - `pg_proc` dla `schedule_edge_function` helper (z SGU-04 — potwierdzenie reuse).
2. `code--exec ls supabase/functions/ | grep krs` — istniejące edge fns KRS.
3. `code--view supabase/functions/_shared/llm-provider.ts` (head 50 linii) — interfejs `callLLM` (signature, response shape).
4. `code--exec grep -r CRON_SECRET supabase/functions/ | head -5` — pattern z SGU-04.

**Round 2 (po round 1, jeśli potrzebne):**
- `code--view supabase/functions/fetch-krs-data/index.ts` — czy KRS list endpoint czy single-NIP only (decyduje czy worker musi zaimplementować list).
- `code--view src/pages/sgu/SGUProspecting.tsx` (z SGU-05) — punkt rozszerzenia o tab „AI KRS".
- `code--view supabase/functions/sgu-add-lead/index.ts` (SGU-05) — reuse pattern dla RPC accept (chociaż my robimy przez RPC SQL, nie edge fn).

Wypisuję 9-pkt status (OK/BRAK + cytaty + decyzja: wariant (a) directors-insert vs (b) DROP NOT NULL).

### Implementacja (po reconie, 1 batch)

**A. Migracja SQL** `supabase/migrations/<ts>_sgu_06_prospecting_krs.sql` — dokładnie wg specu:
1. Archive snapshot `background_jobs`.
2. ALTER TABLE `background_jobs` ADD COLUMN `actor_user_id uuid REFERENCES auth.users(id)` + DROP NOT NULL na `actor_id` (jeśli recon potwierdzi NOT NULL).
3. CREATE TABLE `sgu_prospecting_candidates` + 3 indexy + 2 unique (per tenant: nip, krs_number).
4. RLS enable + 2 policies (SELECT/UPDATE — partner+director+superadmin; INSERT tylko via SECURITY DEFINER RPC / service_role).
5. RPC `rpc_sgu_accept_prospecting_candidate(uuid)` SECURITY DEFINER + dedup check (po nazwie/phone w SGU teamie) + INSERT contacts + INSERT deal_team_contacts (`source_contact_id=NULL`, `category='lead'`, `status='new'`, notes z AI score).
6. RPC `rpc_sgu_reject_prospecting_candidate(uuid, text)` SECURITY DEFINER.
7. CREATE TABLE `pkd_codes_seed` + GIN index na `search_tsv` + INSERT 50 PKD (z specu, sektory: ubezpieczenia/transport/nieruchomości/budownictwo/IT/zdrowie/usługi).
8. **pg_cron** przez **insert tool** (NIE migracja — zawiera URL/secrets pattern) — `cron.schedule('sgu_prospecting_krs_worker_tick', '*/1 * * * *', $$SELECT public.schedule_edge_function('sgu-prospecting-krs-worker', '{}'::jsonb);$$);`
9. RPC pomocniczy `sgu_next_prospecting_job()` SECURITY DEFINER — zwraca 1 pending job z `FOR UPDATE SKIP LOCKED` (worker reuse, advisory locking).
10. DO $$ verification block + komentarz `-- ROLLBACK:`.

**B. Edge function** `supabase/functions/sgu-prospecting-krs/index.ts` (enqueue):
- CORS + `verifyAuth`.
- RPC: `is_sgu_partner`, `get_current_director_id`, `get_current_tenant_id`.
- Walidacja: min 1 filter (PKD/woj), `max_results ≤ 500`.
- Daily quota: max 5 jobów/user/24h (count na `background_jobs WHERE actor_user_id=auth.uid() AND job_type='sgu_krs_prospecting'`).
- INSERT `background_jobs` (actor_id=NULL, actor_user_id=auth.uid(), job_type, payload, status='pending', progress=0).
- Response: `{ job_id, estimated_minutes }`.

**C. Edge function** `supabase/functions/sgu-prospecting-krs-worker/index.ts` (cron-driven):
- Header `x-cron-secret` check (reuse SGU-04 pattern).
- RPC `sgu_next_prospecting_job` — pobiera 1 job, status→'processing'.
- Parse criteria + cursor (`offset` z `result.next_offset`).
- **KRS API call**: jeśli `fetch-krs-data` ma list endpoint → reuse via `supabase.functions.invoke`. Inaczej fallback: implementacja `fetchKRSList(criteria)` inline z paginacją do `api.ekrs.ms.gov.pl`.
- Pętla max 60 firm/tick:
  - Enrichment per firma (single-NIP `fetch-krs-data` invoke).
  - AI scoring przez `_shared/llm-provider.ts` z prompt PL (zwraca `{score, reasoning}` jako structured output / tool call).
  - INSERT `sgu_prospecting_candidates` (z ai_score, ai_reasoning, ai_model).
  - `await sleep(1000)` po każdej firmie.
  - Co 10 firm: UPDATE `background_jobs.progress`.
- Finalize: jeśli batch < 60 → `status='completed'`, `result.candidates_added`. Inaczej `result.next_offset` dla kontynuacji.
- try/catch — failure → `status='failed', error=msg`, dotychczas zapisani kandydaci zostają.

**D. Hooki** (`src/hooks/`):
- `useStartKRSProspecting.ts` — mutation `invoke('sgu-prospecting-krs')` + toast „Job #X uruchomiony, ~Y min" + invalidate `['background-jobs']`.
- `useProspectingCandidates.ts` — query `sgu_prospecting_candidates` (filtry: jobId, status, sort by ai_score DESC) + `acceptMutation` (RPC) + `rejectMutation` (RPC) + bulk variants.
- `useProspectingJobStatus.ts` — query `background_jobs` po jobId, `refetchInterval: status IN ('pending','processing') ? 5000 : false`.
- `usePKDCodes.ts` — query `pkd_codes_seed` z `search_tsv @@ plainto_tsquery('simple', input)` LIMIT 20.

**E. Komponenty** (`src/components/sgu/`):
- `KRSProspectingForm.tsx` — RHF + Zod (PKD multi, województwo select 16 hardcoded, miasto input, promień slider, employees min/max, forma_prawna multi, max_results 1-500). Submit → `useStartKRSProspecting`.
- `PKDAutocomplete.tsx` — shadcn Combobox (cmdk) z multi-select; query do `pkd_codes_seed` (tsv search).
- `ProspectingCandidatesList.tsx` — `<Table>` z checkbox column, AI score badge (>=70 zielony / 40-69 żółty / <40 szary), popover ai_reasoning. Bulk actions: Zaakceptuj zaznaczone / Odrzuć / Auto-accept top 10 (>=70) / Auto-reject (<50). Row expand: pełny ai_reasoning + link `https://rejestr.io/krs/<numer>`.
- `ProspectingJobProgress.tsx` — `<Progress>` + status badge + button „Pokaż kandydatów" (po completed).

**F. Modyfikacje**:
- `src/pages/sgu/SGUProspecting.tsx` (lub `ProspectingTab.tsx` z SGU-05 — recon zdecyduje punkt) — dodaj zakładki nad tabelą: „Wszystkie" / „Ręczne" / „CSV" / **„AI KRS"**. Tab „AI KRS" zawiera:
  - Sekcja 1: `<KRSProspectingForm>` (collapsible, default open).
  - Sekcja 2: lista jobów (ostatnie 10) z `<ProspectingJobProgress>` per job.
  - Sekcja 3: `<ProspectingCandidatesList jobId={selectedJobId}>`.
- Tab „AI KRS" widoczny TYLKO dla `is_sgu_partner() || directorId` (rep nie widzi).

**G. Walidacja**:
- types.ts auto-regenerowany (nowe tabele + RPC + kolumna).
- Deploy 2 edge fns przez `supabase--deploy_edge_functions`.
- `npm run build` + `npm run lint`.
- Smoke test (4 scenariusze z DoD).

### Pliki

**Nowe (10):**
- `supabase/migrations/<ts>_sgu_06_prospecting_krs.sql`
- `supabase/functions/sgu-prospecting-krs/index.ts`
- `supabase/functions/sgu-prospecting-krs-worker/index.ts`
- `src/hooks/useStartKRSProspecting.ts`
- `src/hooks/useProspectingCandidates.ts`
- `src/hooks/useProspectingJobStatus.ts`
- `src/hooks/usePKDCodes.ts`
- `src/components/sgu/KRSProspectingForm.tsx`
- `src/components/sgu/PKDAutocomplete.tsx`
- `src/components/sgu/ProspectingCandidatesList.tsx`
- `src/components/sgu/ProspectingJobProgress.tsx`

**Modyfikowane (1):**
- `src/components/deals-team/ProspectingTab.tsx` (lub `src/pages/sgu/SGUProspecting.tsx` zależnie od recon) — dodanie taba „AI KRS".

### Ryzyka / decyzje

- **`background_jobs.actor_id NOT NULL`**: Decyzja domyślna **wariant (b)** — DROP NOT NULL (bezpieczne, CRM nadal wypełnia, SGU może dać NULL). Archiwizacja przed ALTER. Jeśli recon pokaże że istnieje trigger/RLS wymagający NOT NULL → fallback do wariantu (a): insert Pawła/Adama do `directors` jako minimalny rekord (decyzja w trakcie implementacji).
- **KRS API list endpoint**: jeśli `fetch-krs-data` to single-NIP enrichment (bez list/search), worker musi zaimplementować `fetchKRSList(criteria)` inline (call do `api.ekrs.ms.gov.pl/api/krs/OdpisAktualny` z paginacją, bez API key). Recon ustali. **Plan B**: jeśli publiczny endpoint nie wspiera listing po PKD → MVP używa `companies` table (już istniejące dane CRM, filter po `pkd_codes` i `address_city`) jako źródło kandydatów; KRS API tylko do enrichment per firma. To realistyczniejsze MVP, mniej zewnętrznych zależności. **Decyzja**: w specu jest „KRS API search" — preferujemy implementację z `api.ekrs.ms.gov.pl`, ale z fallbackiem na `companies` table jeśli endpoint listy niedostępny.
- **AI scoring koszt**: 100 firm × 1 LLM call = 100 calls per job. Daily quota 5 jobów = 500 calls/day. Reuse `_shared/llm-provider.ts` (Gemini default — tani). OK dla MVP.
- **Deno timeout 2 min**: limit 60 firm/tick + sleep 1s = ~60s + LLM 0.5s = ~90s, mieści się. 500 firm = 9 ticków = 9 min total.
- **pg_cron worker self-call**: `schedule_edge_function` z SGU-04 musi istnieć. Recon #6 zweryfikuje. Jeśli brak → fallback do bezpośredniego `net.http_post` w cron job (z URL + Bearer SUPABASE_ANON_KEY).
- **CRON_SECRET**: secret musi być ustawiony w Vault (z SGU-04). Worker bez tego = 401. Recon #9 zweryfikuje.
- **Dedup w accept RPC**: sprawdza po `name` ILIKE + `phone` w SGU teamie. Jeśli match → status='duplicate' (nie INSERT). Inaczej INSERT contacts+deal_team_contacts.
- **PKD seed (50)**: pełna lista GUS ma ~600 kodów. MVP top-50 dla branż SGU. Rozszerzenie = follow-up sprint (np. import z pliku CSV GUS).

### Raport końcowy
1. Lista nowych + modyfikowanych plików (absolute paths).
2. Status migracji + insert pg_cron job + 2 edge fns deploy.
3. Wyniki 9-pkt reconu + decyzja (wariant a/b dla actor_id, czy fetch-krs-data ma list endpoint, czy schedule_edge_function istnieje).
4. `SELECT jobname, schedule, active FROM cron.job WHERE jobname='sgu_prospecting_krs_worker_tick';`
5. Smoke test: (a) Paweł submit form → job_id; (b) wait 2-3 min → kandydaci w `sgu_prospecting_candidates` z AI score; (c) accept top 3 → 3 nowe `deal_team_contacts` z source_contact_id=NULL i source w notes; (d) rep login → tab „AI KRS" niewidoczny.
6. `npm run build` + `npm run lint`.

Po Twojej akceptacji: recon (9 calls) → implementacja (1 batch) → migracja + insert pg_cron + deploy 2 edge fns → smoke test → raport.
