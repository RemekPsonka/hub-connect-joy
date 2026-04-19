

## Sprint 19 — Enrich company → background job + konsolidacja edge functions (zaadaptowany)

### Reality check vs MD
- ✅ `tenants`, `directors`, `company_data_sources`, `get_current_tenant_id()`, `schedule_edge_function` — istnieją.
- ❌ `background_jobs` nie istnieje — tworzymy.
- ✅ Wszystkie 7 starych functions istnieje fizycznie: `enrich-company-data` (2700 linii), `enrich-person-data`, `generate-contact-profile`, `analyze-linkedin-profile`, `ocr-business-card`, `ocr-business-cards-batch`, `bulk-merge-contacts`, `merge-contacts`.
- ⚠️ MD używa `cron.schedule` z `app.edge_url` — u nas standard to **`schedule_edge_function`** (Vault). Korekta.
- ⚠️ FE callsite'ów do podmiany: 11 (lista ze grep wyżej).

### Korekty
1. **Cron**: `SELECT schedule_edge_function('enrich_company_worker_1min', '* * * * *', '/functions/v1/enrich-company-worker', '{}');`
2. **Realtime**: `gen_random_uuid()` channel per `actor_id`, FE subskrybuje `background_jobs` filtered po `actor_id=auth.uid()`-mapped director.
3. **Stare functions kasujemy fizycznie** (`supabase--delete_edge_functions`) — nie tylko config.toml.
4. **Brak nowej strony notyfikacji** — używam istniejącego pattern toast (sonner) + dzwonek w `HeaderBar.tsx`.
5. **`merge-contacts` podmieniam in-place** (przyjmuje `pairs[]`); `enrich-person-data` przemianowuję na `enrich-person` przez delete-stary + create-nowy.

### A. Migracja `<ts>_sprint19_background_jobs.sql`
- Snapshot: `archive.functions_routines_snapshot_20260419` (lista routines pre-sprint).
- CREATE `public.background_jobs` (zgodnie z MD: id, tenant_id FK, actor_id FK directors, job_type, payload jsonb, status CHECK, progress 0-100, result jsonb, error, timestamps).
- 2 indeksy: `(status, job_type, created_at) WHERE status IN ('pending','running')`, `(actor_id, created_at DESC)`.
- RLS: SELECT/INSERT/UPDATE per tenant via `get_current_tenant_id()`.
- `ALTER PUBLICATION supabase_realtime ADD TABLE background_jobs;`
- `SELECT schedule_edge_function('enrich_company_worker_1min', '* * * * *', '/functions/v1/enrich-company-worker', '{}');`
- ROLLBACK skomentowany.

### B. Edge Functions — nowe

**`enqueue-enrich-company`** (POST `{company_id}`):
- `requireAuth` + rate-limit 10/h.
- INSERT do `background_jobs` (`job_type='enrich_company'`, payload, status='pending', actor_id=director.id).
- Zwróć `{job_id}` (<200ms).

**`enrich-company-worker`** (cron, service-role):
- `SELECT ... FROM background_jobs WHERE status='pending' AND job_type='enrich_company' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`.
- UPDATE running, started_at.
- 5-step pipeline: `verify-company-source` → `scan-company-website` → `analyze-company-external` → `fetch-company-financials` → `synthesize-company-profile` przez `supabase.functions.invoke()`. Po każdym kroku UPDATE progress (20/40/60/80/100).
- Try/catch → status `completed` lub `failed` + error.

**`enrich-person`** (orchestrator z flagą `mode: 'full'|'linkedin'|'profile'`):
- Konsoliduje logikę 3 functions. Domyślnie `full`. Per-mode wykonuje odpowiednie sekcje.
- Po deploy: usuwam `enrich-person-data`, `generate-contact-profile`, `analyze-linkedin-profile`.

**`ocr-business-cards`** (nowy, body `{items: [{image_base64, filename?}]}`):
- Iteracja po items, zwraca `{results: [...]}`. Single = array z 1.
- Po deploy: usuwam `ocr-business-card`, `ocr-business-cards-batch`.

**`merge-contacts`** (podmieniona, body `{pairs: [{target_id, source_ids[]}]}`):
- Iteracja po pairs. Single merge = pairs z 1.
- Po deploy: usuwam `bulk-merge-contacts`.

### C. Frontend

**`src/hooks/useCompanies.ts`** (3 callsite'y):
- `enrichCompany(id)` → POST `enqueue-enrich-company`, toast „Wzbogacenie zlecone" + zwróć `job_id`. Bez czekania.
- 2 pozostałe callsite'y (linie 888, 983 — bulk?) → też przez enqueue.

**`src/hooks/useAIImport.ts`**: 
- L502 `ocr-business-cards-batch` → `ocr-business-cards` (już array).
- L653 `enrich-company-data` → `enqueue-enrich-company` (background).
- L697 `enrich-person-data` → `enrich-person` (mode='full').

**`src/hooks/useBusinessCardOCR.ts`**:
- L113 `ocr-business-card` → `ocr-business-cards` (wrap w `items:[{...}]`).
- L140 `enrich-company-data` → `enqueue-enrich-company`.
- L270 `enrich-person-data` → `enrich-person`.

**`src/hooks/useContacts.ts`**:
- L357 `bulk-merge-contacts` → `merge-contacts` (z pairs).
- L545 `generate-contact-profile` → `enrich-person` (mode='profile').

**`src/hooks/useLinkedInAnalysis.ts`** L51: `analyze-linkedin-profile` → `enrich-person` (mode='linkedin').

**`src/components/wanted/WantedCheckActions.tsx`** L88: `enrich-person-data` → `enrich-person`.

**`src/hooks/useBackgroundJobs.ts`** (nowy):
- `useMyJobs()` — lista pending/running/recent dla zalogowanego directora.
- `useJobRealtime()` — subskrypcja realtime `background_jobs` filtered po actor_id; on completed → toast (sonner) z linkiem do `/companies/:id` (jeśli enrich_company); on failed → toast.error.

**`src/components/notifications/JobsBell.tsx`** (nowy) — dzwonek w `HeaderBar.tsx`:
- Badge z licznikiem pending+running.
- Popover z listą ostatnich 10 jobów.
- Mountowany w `HeaderBar` aby realtime działał globalnie.

### D. Kasacja starych functions
Przez `supabase--delete_edge_functions`:
- `enrich-company-data`, `enrich-person-data`, `generate-contact-profile`, `analyze-linkedin-profile`, `ocr-business-card`, `ocr-business-cards-batch`, `bulk-merge-contacts`.

### E. Memory
- `mem://features/background-jobs-system` — opisuje pattern enqueue+worker+realtime+bell.
- Update `mem://index.md`.

### F. Kolejność wykonania
1. Migracja SQL (background_jobs + cron).
2. `enqueue-enrich-company` + `enrich-company-worker` (deploy).
3. `enrich-person` (orchestrator, deploy).
4. `ocr-business-cards` (deploy).
5. `merge-contacts` podmiana (deploy).
6. FE: `useBackgroundJobs.ts` + `JobsBell.tsx` + mount w `HeaderBar`.
7. FE: podmiana wszystkich 11 callsite'ów.
8. Kasacja 7 starych functions.
9. Memory.

### G. DoD
- [ ] `background_jobs` z RLS + realtime publication + cron co 1 min.
- [ ] `/companies/:id` → „Wzbogać" → toast „Zlecono" w <1s.
- [ ] Po ~1-2 min → toast „Wzbogacenie gotowe" + dzwonek miga.
- [ ] 7 starych functions usuniętych z deploymentu.
- [ ] OCR/merge/enrich-person działają przez nowe konsolidowane endpointy.

### H. Ryzyka
- **R1** Worker timeout (150s) jeśli pełen pipeline > 2.5 min. Mitygacja: każdy step to osobne `functions.invoke()` (każdy ma własny limit). Worker sam tylko orkiestruje.
- **R2** Race condition w `FOR UPDATE SKIP LOCKED` przy >1 cron tick — bezpieczne (Postgres gwarantuje).
- **R3** FE callsite'y czekające na sync response (np. AIImport flow) — po przejściu na enqueue muszą obsłużyć async (toast + brak danych natychmiast). Dla AIImport zostawiam sync `enrich-person` (mode=full nie jest background); tylko company→background.
- **R4** Realtime RLS — `actor_id` musi mapować na directors.id zalogowanego usera; subskrypcja filtruje po `tenant_id` z RLS (auto).
- **R5** Kasacja `enrich-company-data` (2700 linii) — sprawdzam czy żaden inny edge function nie woła go (z grep: nie woła).

