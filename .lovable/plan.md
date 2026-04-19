
Sprint 19c — duży, ryzykowny. Najpierw recon żeby uniknąć red flagów ze spec'u.

## Recon (przed pisaniem migracji)

1. **Schemat `companies`** — które z 8 legacy kolumn faktycznie istnieją? Sprawdzę `information_schema.columns`.
2. **Schemat `company_data_sources`** — `source_type` enum vs text + kompletna lista wartości używanych w kodzie (już w `useCompanyDataSources.ts` widzę: `external_api | www | financial_3y | ai_analysis | source_data_api | other`). UWAGA: spec mówi `'website' | 'financials' | 'profile'` — to NIE pasuje do aktualnego enum (`www`, `financial_3y`, `ai_analysis`). **Czerwona flaga #2 ze spec'u.** Trzymam się aktualnych wartości.
3. **Trigger `trg_sync_company_data_sources`** — czy istnieje? Jaka funkcja?
4. **Worker `enrich-company-worker`** — z kontekstu widzę że ma 5 kroków w `PIPELINE`. ✅ Czerwona flaga #1 OK.
5. **`enqueue-enrich-company`** — sprawdzić że istnieje i przyjmuje `{ company_id }`.
6. **FE call-sites** — pełny grep po: legacy kolumnach, `enrich-company-data`, `ocr-business-card[s-batch]?`, `bulk-merge-contacts`, `analyze-linkedin-profile`, `generate-contact-profile`, `enrich-person-data`.
7. **`src/lib/export/companies.ts`** lub jakikolwiek eksport — czy czyta legacy kolumny? (czerwona flaga #3).
8. **Edge fn write-sites** — `scan-company-website`, `analyze-company-external`, `fetch-company-financials`, `synthesize-company-profile` — co dokładnie zapisują dziś?

## Mapowanie source_type (decyzja)

Trzymam istniejące wartości enum z `useCompanyDataSources.ts`:
- `external_data` → `external_api`
- `www_data` → `www`
- `financial_data_3y` → `financial_3y`
- `ai_analysis` → `ai_analysis`

To jest ZGODNE z tym co już używa FE. Nie wprowadzam nowych wartości typu `website/financials/profile` — to by zepsuło już działający `CompanyExternalDataTab`.

## Plan wykonania (po recon)

### A. Companies dual-write cleanup
- **A1** migracja `*_a1_companies_backup.sql`: `archive.companies_backup_20260419` + count.
- **A2** migracja `*_a2_backfill_company_data_sources.sql`: 4× `INSERT ... ON CONFLICT (company_id, source_type) DO NOTHING` (lub DO UPDATE jeśli unique constraint istnieje; jeśli nie — najpierw sprawdzę i ewentualnie pominę ON CONFLICT, użyję `WHERE NOT EXISTS`). Mapowanie j.w.
- **A3** migracja `*_a3_drop_dualwrite_trigger.sql`: `DROP TRIGGER IF EXISTS trg_sync_company_data_sources` + `DROP FUNCTION IF EXISTS public.sync_company_data_sources()` (sprawdzę dokładną nazwę w recon).
- **A4** edge fn refactor:
  - `scan-company-website` → tylko `company_data_sources` (`source_type='www'`), wyciąć update na `companies.www_data*`.
  - `analyze-company-external` → `source_type='external_api'`, wyciąć update na `companies.external_data*`.
  - `fetch-company-financials` → `source_type='financial_3y'`, wyciąć update na `companies.financial_data_3y`.
  - `synthesize-company-profile` → `source_type='ai_analysis'`, wyciąć update na `companies.ai_analysis`.
  - **NIE rusz** `enrich-company-data` (skasujemy w E).
- **A4 FE refactor**:
  - `useCompanies.ts`, `useCompanyProfile.ts`, `useCompanyEnrichment.ts` — usunąć selecty legacy kolumn, dane czytać przez `useCompanyDataSources(companyId)`.
  - `CompanyDetail.tsx`, `SourcesTabContent.tsx`, `CompanyPipelineController.tsx` — przepiąć na hook.
- **A5** migracja `*_a5_rename_legacy_columns.sql`: `DO $$ ... ALTER TABLE ... RENAME COLUMN` w bloku z `EXCEPTION WHEN undefined_column THEN NULL` per kolumna. RENAME tylko tych które recon potwierdzi.
- **WAŻNE kolejność**: A1 → A2 → A3 → A4 (kod) → testy build → A5 (rename). Jeśli A4 zostawi gdzieś `companies.external_data` to A5 zepsuje `tsc`.

### B. OCR konsolidacja
- Grep call-sites starych endpointów.
- Zamienić wywołania na `ocr-business-cards` z `{ items: [{ image_base64, filename }] }` (to jest aktualny kontrakt z kontekstu, NIE `{ images: [...] }` jak w spec — spec się myli, trzymam istniejący kontrakt z `ocr-business-cards/index.ts`).
- Usunąć foldery `ocr-business-card/` i `ocr-business-cards-batch/` + sekcje w `config.toml` (jeśli są) + `delete_edge_functions`.

### C. merge-contacts
- Otworzyć `merge-contacts/index.ts` — sprawdzić aktualną logikę. Rozszerzyć: jeśli body ma `pairs: []` → iteracja nad single-merge logic; w przeciwnym razie zachowanie aktualne (backward compat).
- Grep `bulk-merge-contacts` w `src/` → zamienić na `merge-contacts` z `{ pairs: [...] }`.
- Usunąć folder `bulk-merge-contacts/` + `delete_edge_functions`.

### D. enrich-person orchestrator
- Już istnieje (kontekst). Zmiana kontraktu: zamiast `mode: 'full'|'profile'|'linkedin'` rozszerzyć na `{ contact_id, steps?: ['linkedin'|'profile'|'data'] }` (default wszystkie 3) + agregacja wyników. Backward compat: jeśli body ma `mode` → mapuj na pojedynczy step.
- Grep `analyze-linkedin-profile|generate-contact-profile|enrich-person-data` w `src/` → zamienić na `enrich-person` z odpowiednim `steps`.
- Dodać header-comment `// INTERNAL` w 3 plikach implementacyjnych.
- NIE kasujemy folderów (orchestrator je woła).

### E. enrich-company-data wyłączenie
- Grep — potwierdzić 5 call-sites (spec mówi 5, walidacja).
- Każde wywołanie: `enrich-company-data` → `enqueue-enrich-company` z `{ company_id }`. Toast „Wzbogacanie w tle".
- Sprawdzić czy `useBackgroundJob(jobId)` istnieje (kontekst memorek wskazuje na tabelę `background_jobs` + JobsBell). Jeśli tak — użyć dla progress UI tam gdzie ma sens. Jeśli nie — sam toast wystarczy (worker i tak loguje progress do `background_jobs`).
- Worker: kontekst pokazuje 5 kroków. ✅
- Po grep=0 → kasacja folderu `enrich-company-data/` + sekcji config.toml (jeśli jest) + `delete_edge_functions`. Jeśli jakaś niepewność (np. nie znalazłem `enqueue-enrich-company`) → ZOSTAW i raport.

## Kolejność tool calls

1. **Recon (równolegle)**: 
   - `supabase--read_query`: kolumny `companies` + `pg_trigger` dla trg_sync + count companies + `\d company_data_sources` (constraint info).
   - `code--exec`: jeden `grep -rn` na wszystkie 9 wzorców + `ls supabase/functions/` (filtr na enrich/ocr/merge/enqueue) + sprawdzenie `src/lib/export/`.
   - `code--view`: `useCompanies.ts`, `useCompanyProfile.ts`, `useCompanyEnrichment.ts`, `CompanyDetail.tsx`, `SourcesTabContent.tsx`, edge fn (4 write-sites + `merge-contacts` + `enqueue-enrich-company` jeśli istnieje).
2. **A1**: backup migration.
3. **A2**: backfill (po sprawdzeniu unique constraint).
4. **A3**: drop trigger.
5. **A4**: edge fn (4 plików) → FE hooks + komponenty (równolegle gdzie się da).
6. **build/lint check** przed A5.
7. **A5**: rename columns.
8. **B**: OCR przepięcie + delete.
9. **C**: merge-contacts rozszerzenie + przepięcie + delete.
10. **D**: enrich-person rozbudowa + przepięcie + INTERNAL comments.
11. **E**: enrich-company-data przepięcie + delete (warunkowo).
12. **lint** w tle + raport końcowy z 3 listami (zrobione / odłożone / wymagające decyzji).

## Pytania / red flags do user'a

Nic blokującego — recon rozstrzygnie wątpliwości. Trzymam się istniejących `source_type` z `useCompanyDataSources.ts` (nie tych ze spec'u, które się myli).

Jeśli w trakcie wykryję że `enqueue-enrich-company` nie istnieje LUB worker nie ma 5 kroków — ZATRZYMAM sekcję E i raportuję jako blocker do decyzji. A-D pójdą niezależnie.

Bez zmian w `ContactBI`, `useContactAgent`, `Sovra`, `_shared/llm-provider.ts`. Bez DROP danych. Tylko RENAME kolumn (fizyczny DROP w osobnej migracji za 30 dni).
