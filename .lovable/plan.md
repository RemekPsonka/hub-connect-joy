
Sprint 19c-β. Spec szczegółowy, ale trzeba zweryfikować rzeczywiste nazwy kolumn (spec wymienia 15, ja muszę potwierdzić każdą) i mapowanie `source_type` (z `useCompanyDataSources.ts` widzę: `external_api | www | financial_3y | ai_analysis | source_data_api | other` — to NIE pasuje do mapowania w spec'u: `website_scan | external_analysis | financials | verification | profile_synthesis`).

## Recon (przed pisaniem migracji i kodu)

1. **Kolumny `companies`** — `information_schema.columns` → potwierdzić że wszystkie 15 z listy istnieją (i dokładne nazwy). Niektóre mogą się nazywać inaczej (np. `external_data_status` vs `external_data_updated_at`).
2. **`company_data_sources`** — sprawdzić enum `source_type` (jakie wartości DOZWOLONE) + czy istnieje UNIQUE `(company_id, source_type)`.
3. **`enrich-company-worker`** — przeczytać żeby zobaczyć JAKIE source_type faktycznie ZAPISUJE. To jest źródło prawdy dla mapowania backfillu.
4. **`useCompanies.ts`** linie 448, 888, 983, 1225 — przeczytać aktualne wywołania + helper :1225 jako wzorzec.
5. **`useAIImport.ts:663`, `useBusinessCardOCR.ts:141`** — kontekst wywołań.
6. **Pliki FE czytające legacy** — `CompanyPipelineController`, `useCompanyAnalysisQueries`, `SourcesTabContent`, `CompanyModal`, `CompanyView` (sprawdzić ścieżki) + grep na każdą legacy kolumnę.

## Decyzje (rozstrzygnę po recon)

**A. Mapowanie source_type** — używam wartości z `enrich-company-worker` (źródło prawdy w prod). Spec mówi `website_scan/external_analysis/financials/verification/profile_synthesis`, ale obecny FE i worker mogą używać innych. Jeśli rozjazd → trzymam się wartości WORKERA (bo to one są w prod w `company_data_sources`), nie spec'u. Raportuję rozjazd.

**B. Lista kolumn do RENAME** — tylko te które recon potwierdzi że istnieją. Brakujące pomijam (z notatką w raporcie).

**C. Helper `useEnrichCompany`** — tworzę nowy `src/hooks/useEnrichCompany.ts` z `enqueueEnrichCompany(companyId, opts)` i przepinam wszystkie 5 + ewentualnie :1225 (jeśli dziś tam jest inline).

## Plan wykonania (po recon)

### A. Migracja SQL — `20260419120000_sprint19c_beta_companies_dualwrite.sql`
1. Snapshot `archive.companies_legacy_cols_20260419` z dokładnie tymi kolumnami które potwierdził recon (+ id) + REVOKE + integralność DO $$ ... RAISE EXCEPTION on mismatch.
2. UNIQUE `(company_id, source_type)` — DODAJ jeśli brak (idempotent DO $$).
3. 6× `INSERT ... ON CONFLICT (company_id, source_type) DO NOTHING` z mapowaniem zgodnym z workerem (potwierdzonym w recon).
4. `DROP TRIGGER IF EXISTS trg_sync_company_data_sources` + `DROP FUNCTION IF EXISTS public.sync_company_data_sources() CASCADE`.
5. 15× `ALTER TABLE ... RENAME COLUMN ... TO deprecated_*_20260419` w bloku `DO $$ ... EXCEPTION WHEN undefined_column THEN NULL` per kolumna (idempotentność dla brakujących).
6. `COMMENT ON COLUMN` z markerem DROP 2026-05-19.

Wszystko w `BEGIN ... COMMIT`. ROLLBACK w komentarzu na końcu pliku.

### B. Edge function cleanup
- Usuń folder `supabase/functions/enrich-company-data/`.
- Usuń sekcję z `supabase/config.toml` (jeśli jest).
- `supabase--delete_edge_functions(["enrich-company-data"])`.

### C. Helper + 5 call-sites
- Nowy `src/hooks/useEnrichCompany.ts`:
  ```ts
  export async function enqueueEnrichCompany(
    companyId: string,
    opts?: { showToast?: boolean }
  ): Promise<{ job_id: string }>
  ```
  Wywołuje `enqueue-enrich-company`, pokazuje toast „Wzbogacenie firmy zlecone — powiadomię, gdy gotowe.", rzuca z polskim błędem, zwraca `{ job_id }`.
- Refactor 6 call-sites (5 starych + :1225 jeśli inline):
  - `useCompanies.ts:448, 888, 983, 1225`
  - `useAIImport.ts:663`
  - `useBusinessCardOCR.ts:141`
- We wszystkich: usuwam synchronous wait, modale zamykają się natychmiast.

### D. FE refactor czytania legacy → `useCompanyDataSources`
- Grep wszystkie wystąpienia `\.ai_analysis|\.www_data|\.external_data|\.financial_data_3y|\.source_data_api|\.company_analysis_` w `src/`.
- Refaktor każdego pliku:
  - Pobranie danych przez `useCompanyDataSources(companyId)` zamiast czytania z `companies.*`.
  - W queries (`useCompanyAnalysisQueries.ts`) — zamiast `select('ai_analysis')` użyć JOIN-a z `company_data_sources` (oddzielne query lub RPC). Ostrożnie: tutaj jest ORDER BY na `analysis_confidence_score` (kolumna `companies` która NIE jest legacy — zostaje). Mapping: gdzie czytamy `analysis.revenue` itp. — bierzemy `data` z rekordu CDS o source_type `ai_analysis`.
  - `CompanyPipelineController` — orkiestrator pewnie czyta `*_status` żeby wiedzieć co odpalić → po refaktorze czyta `status` z odpowiednich CDS rekordów (lub `background_jobs`).
- Removy odczyty pól `ai_analysis/www_data/...` ze SELECT-ów w hookach typu `useCompanies` (brak legacy czyta = mniej danych w odpowiedzi).

### E. Walidacje końcowe
- `npx tsc --noEmit` → 0 błędów (jeśli >0 — naprawiam iteracyjnie).
- `grep -rn "enrich-company-data" src/` → 0.
- `grep -rnE "\.ai_analysis|\.www_data|\.external_data|\.financial_data_3y|\.source_data_api|\.company_analysis_" src/` → 0 (poza `useCompanyDataSources` jeśli wewnętrznie mapuje string `'ai_analysis'`).
- `supabase--read_query`: weryfikacja DoD (snapshot count, trigger gone, 15 deprecated kolumn).

### F. Raport końcowy
3 sekcje: ✅ Zrobione / ⚠️ Rozjazdy ze spec'em (mapowanie source_type, brakujące kolumny) / 📋 Następne kroki (DROP za 30 dni, leaked password toggle).

## Ryzyka

1. **Rozjazd source_type między spec a worker** — najbardziej prawdopodobny. Trzymam się workera, raportuję.
2. **Brakujące kolumny legacy** — np. `external_data_updated_at` może nie istnieć (może być `external_data_status` zamiast). Recon potwierdzi, RENAME w bloku z EXCEPTION.
3. **`useCompanyAnalysisQueries.ts`** używa `ai_analysis` w ORDER BY i WHERE w wielu hookach. Pełen refactor wymaga przejścia na JOIN z `company_data_sources` w każdej funkcji — to ~10 funkcji do przepisania. Ostrożnie z performance (LIMIT 100 i filter w JS jest OK).
4. **TypeScript types** — po RENAME `types.ts` regeneruje się automatycznie, więc każdy pozostały odczyt `.ai_analysis` itp. da error w buildzie. To jest naszą siatką bezpieczeństwa.

## Co NIE robię
- Toggle leaked password — wymaga akcji usera w dashboardzie, nie kodzie. Zaznaczę w raporcie końcowym.
- Fizyczny DROP kolumn — dopiero 2026-05-19, osobna migracja.
- Cleanup `any → unknown` — nie blokuje, osobny tech debt.

Po Twojej akceptacji przechodzę do default mode i wykonuję recon → migrację → kod → walidację → raport.
