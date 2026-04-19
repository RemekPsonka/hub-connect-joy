
User chce gatekeeper test: czy `enrich-company-worker` aktualizuje legacy kolumny (`companies.ai_analysis`, `company_analysis_date` itd.) czy tylko `company_data_sources`. To rozstrzyga publikację vs konieczność β.2 przed publikacją.

## Plan recon (READ-ONLY, bez czekania na user-test)

Zamiast czekać aż user kliknie „Wzbogać" i zmierzy timestampy, **przeczytam kod workera** — to deterministyczne i 100% jednoznaczne.

### Krok 1: znaleźć worker
- `code--list_dir supabase/functions/enrich-company-worker/`
- `code--view supabase/functions/enrich-company-worker/index.ts`

### Krok 2: grep w workerze + powiązanych funkcjach
- `code--search_files` po `companies` (UPDATE/upsert) w `supabase/functions/enrich-company-worker/`
- Sprawdzić też 4 sub-funkcje pipeline'u (`scan-company-website`, `analyze-company-external`, `fetch-company-financials`, `synthesize-company-profile`) — czy któraś robi UPDATE legacy.

### Krok 3: weryfikacja DB
- `supabase--read_query`: na 3 najświeższych firmach z `company_data_sources` porównać `fetched_at` vs `companies.company_analysis_date`. Jeśli któraś ma świeży CDS (np. ostatnie 24h) i stary `company_analysis_date` → worker NIE pisze do legacy. Jeśli oba świeże i bliskie sobie → pisze.

### Krok 4: rozstrzygnięcie + raport
3 możliwe outcome:

**A) Worker pisze do legacy (UPDATE companies.* + INSERT CDS)**  
→ β.1 bezpieczna, można publikować. β.2 bez presji czasowej.

**B) Worker pisze TYLKO do CDS**  
→ silent regression. Dwie opcje (decyzja user'a):
   - **Hotfix**: dopisać do workera `UPDATE companies SET ai_analysis = ..., company_analysis_date = now()` na końcu każdego kroku — szybkie, utrzymuje legacy aktualne do β.2.
   - **β.2 przed publikacją**: refaktor 10 plików FE na `useCompanyDataSources`. Większy zakres, dłużej.

**C) Mieszane** (np. niektóre kroki pipeline'u piszą legacy, inne nie)  
→ wskazać konkretnie który krok wymaga hotfixu.

### Co NIE robię w tym planie
- Nie czekam na user-test (kod workera daje pewną odpowiedź).
- Nie toggluję leaked password (to akcja w dashboardzie Supabase, nie w kodzie — przypomnę user'owi w raporcie).
- Nie piszę β.2 ani hotfixu — to po wyniku reconu i decyzji usera.

### Tool calls (round 1, równolegle)
1. `code--list_dir supabase/functions/enrich-company-worker`
2. `code--search_files` query=`from\(['"]companies['"]\)\.(update|upsert)` w `supabase/functions/`, include `*.ts`
3. `supabase--read_query`: TOP 5 firm po `company_data_sources.fetched_at DESC` z JOIN-em na `companies` po `company_analysis_date`, `updated_at`.

Po wynikach — round 2: `code--view` na konkretne pliki + raport z rekomendacją (A/B/C).
