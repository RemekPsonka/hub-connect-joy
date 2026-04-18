

# Sprint 08 — Companies 2.0 (zaadaptowany)

## Korekty względem sprint MD

**Realia bazy (52 kolumn, 1738 firm):**
- Faktyczne nazwy: `source_data_status/_date` (nie `source_data_api_status`), `financial_data_status/_date` (nie `financial_data_3y_status`), `company_analysis_status/_date` (nie `ai_analysis_status`).
- `ai_analysis` (jsonb) jest **mocno używane** w 23 plikach (FE + edge functions). Rename = wybuch enrichmentu.
- Dane do migracji: external=11, source_data_api=549, www=10, financial=11, ai_analysis=31. `is_group=0`, `group_companies` puste.

**Decyzja architektoniczna — split na dwie fazy:**
1. **TERAZ (ten sprint):** backend-only — nowa tabela `company_data_sources` + backfill + UNIQUE indexes + nowy hook. **NIE deprecate** kolumn (zachowuje kompatybilność z 23 plikami enrichment). Kolumny zostają jako "legacy mirror" do osobnego sprintu czyszczenia po pełnym przepięciu enrichment edge functions.
2. **PÓŹNIEJ (Sprint 19+):** rename → deprecated_* kolumn po przepięciu wszystkich edge functions na `company_data_sources`.

UI redesign **pomijam** — sprint MD wymaga briefu Remka "co nie pasuje w widoku Firm" (warunek startu). Dotykam tylko nowy tab "Dane zewnętrzne" w istniejącym `CompanyDetail`.

## A. Migracja SQL `supabase/migrations/<ts>_sprint08_companies2.sql`

1. Archiwizacja: `archive.companies_backup_20260418` (1738 wierszy).
2. `CREATE TABLE public.company_data_sources` (id, tenant_id FK, company_id FK, source_type CHECK IN ('external_api','www','financial_3y','ai_analysis','source_data_api','other'), data jsonb, status, fetched_at, created_at). Indeksy: `(company_id, source_type)`, `(tenant_id)`. RLS po `tenant_id = get_current_tenant_id()` (SELECT/INSERT/UPDATE/DELETE).
3. Backfill 5 INSERT-ów z nie-pustych kolumn (~612 wierszy razem).
4. UNIQUE indexes: `uniq_companies_tenant_nip` i `uniq_companies_tenant_krs` (partial WHERE NOT NULL AND <> '').
5. **Pomijam** rename kolumn na `deprecated_*` (osobny sprint po przepięciu enrichment).
6. `-- ROLLBACK:` skrypt: DROP `company_data_sources` + DROP unique indexes.

## B. Frontend

- **Nowe `src/hooks/useCompanyDataSources.ts`** — `useCompanyDataSources(companyId)`: SELECT z `company_data_sources` zwraca `Record<source_type, DataSource>` (grupowane).
- **Nowy `src/components/companies/CompanyExternalDataTab.tsx`** — render 5 sekcji (External API, KRS/CEIDG, WWW, Financial 3Y, AI Analysis) z JSON viewer + status badge + fetched_at. Fallback "brak danych" jeśli source_type nieobecny.
- **Edycja `src/components/company/CompanyFlatTabs.tsx`** — dodaję tab "Dane zewnętrzne" → `<CompanyExternalDataTab companyId={company.id} />`.
- `useCompanies.ts` **nie ruszam** — kolumny istnieją, FE działa.

## C. Edge functions

**Bez zmian.** Enrichment functions nadal piszą do legacy kolumn `companies.*_data`. Synchronizacja do `company_data_sources` wprowadzimy w Sprincie 19 (refactor enrichment).

**Opcjonalnie (decyzja Remka):** trigger `AFTER UPDATE ON companies` który mirroruje zmiany `external_data/www_data/financial_data_3y/ai_analysis/source_data_api` do `company_data_sources` (UPSERT po `(company_id, source_type)`). Daje to żywe dane w nowej tabeli bez ruszania edge fn. **Domyślnie: TAK** — to czysty zysk, pojedyncza migracja.

## D. Kolejność wykonania

1. SQL migracja (archive + table + RLS + backfill + UNIQUE + trigger sync).
2. `useCompanyDataSources.ts` (read hook).
3. `CompanyExternalDataTab.tsx` + dopisanie taba w `CompanyFlatTabs.tsx`.
4. Build + smoke (lista firm działa, CompanyDetail tab "Dane zewnętrzne" pokazuje dane).

## E. DoD

- [ ] `archive.companies_backup_20260418` istnieje (1738 wierszy).
- [ ] `public.company_data_sources` z RLS i ~612 wierszami po backfill.
- [ ] UNIQUE(tenant_id, nip) i UNIQUE(tenant_id, krs) — partial.
- [ ] Trigger sync utrzymuje `company_data_sources` przy UPDATE `companies`.
- [ ] CompanyDetail ma nowy tab "Dane zewnętrzne" z 5 sekcjami source_type.
- [ ] Brak regresji: enrichment flow (analyze-company-external, verify-company-source, fetch-company-financials, update-company-revenue) działa bez zmian.

## F. Ryzyka

- **R1: UNIQUE conflict.** W `companies` mogą istnieć duplikaty NIP w obrębie tenant_id. Migracja padnie. **Mitigacja:** przed CREATE UNIQUE — `SELECT tenant_id, nip, COUNT(*) FROM companies WHERE nip <> '' GROUP BY 1,2 HAVING COUNT(*)>1`. Jeśli są — `RAISE NOTICE` listę i abort. Naprawa duplikatów = osobna migracja.
- **R2: Trigger overhead.** Sync trigger na każdym UPDATE companies. ~1738 wierszy, niski ruch — ok.
- **R3: UI pominięte.** Sprint MD wymagał redesignu listy + 5 tabów. Czekamy na brief Remka. Dostarczamy tylko backend + 1 tab.
- **R4: Schema mismatch.** Sprint MD odwołuje się do nieistniejących kolumn (`source_data_api_status`, `financial_data_3y_status`, `ai_analysis_status`). Backfill dostosowany do realiów (`source_data_status`, `financial_data_status`, `company_analysis_status`).

