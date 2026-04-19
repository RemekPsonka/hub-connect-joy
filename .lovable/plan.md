
## Sprint SGU-08 — Raporty miesięczne/kwartalne + PDF export

### Recon (READ-ONLY, równolegle)

**Round 1 — 5 calls równolegle:**
1. `supabase--read_query` × 4:
   - `pg_matviews WHERE matviewname LIKE 'mv_sgu_%'` — potwierdzenie SGU-04 MV (do reuse w snapshot logic).
   - `cron.job WHERE jobname LIKE 'sgu_%'` — żeby nie kolidować z istniejącymi (SGU-04 weekly KPI refresh, SGU-06 KRS worker, SGU-07 web worker).
   - `storage.buckets WHERE id='sgu-reports'` — domyślnie brak, MVP bez bucketu.
   - `tasks` kolumny (`completed_at`, `status`, `due_date`) dla KPI completed_tasks_count.
2. `code--search_files "jsPDF|from 'jspdf'"` w `src/` — istniejący pattern PDF (polski font, header/footer reuse).

**Round 2 (zależnie):**
- `code--view` znalezionego pliku z jsPDF (jeśli istnieje) — wzorzec embedowania Roboto.
- `code--view src/pages/sgu/SGUReports.tsx` — obecny placeholder z SGU-01 (do zastąpienia).
- `code--view src/components/layout/SGUSidebar.tsx` (lines 30-50) — gdzie dodać link „Raporty" w grupie Overview.
- `code--list_dir public/fonts` — czy Roboto-Regular.ttf już jest.
- `supabase--read_query` — `deal_team_contacts`, `commission_entries`, `insurance_policies` (kolumny istotne dla snapshot data builder).

### Implementacja

**A. Migracja SQL** `supabase/migrations/<ts>_sgu_08_reports.sql`:
1. `CREATE TABLE sgu_reports_snapshots`:
   - `id uuid PK`, `tenant_id`, `team_id`, `period_type text CHECK IN ('weekly','monthly','quarterly','yearly','custom')`, `period_start date`, `period_end date`, `data jsonb NOT NULL`, `generated_at timestamptz DEFAULT now()`, `generated_by text CHECK IN ('cron','manual')`, `generated_by_user_id uuid REFERENCES auth.users(id) NULL`.
   - UNIQUE `(tenant_id, team_id, period_type, period_start)` (umożliwia ON CONFLICT UPDATE z cron).
   - Indexy: `(tenant_id, period_type, period_start DESC)`.
2. RLS enable + policies:
   - SELECT: `is_sgu_partner() OR get_current_director_id() IS NOT NULL OR is_superadmin()` (rep blokowany).
   - DELETE: tylko director/superadmin.
   - INSERT/UPDATE: brak policy authenticated → tylko przez SECURITY DEFINER RPC.
3. `rpc_sgu_generate_snapshot_internal(p_tenant uuid, p_team uuid, p_type text, p_start date, p_end date)` SECURITY DEFINER:
   - Buduje `data jsonb` z 6 sekcji (KPI, top_products, team_performance, commission_breakdown, alerts, comparison_previous_period).
   - KPI: `policies_sold_count`, `gwp_pln`, `commission_pln`, `completed_tasks_count`, `new_leads_count`, `conversion_rate_pct` — agregacje na `deal_team_contacts`/`insurance_policies`/`commission_entries`/`tasks` z filtrem `tenant_id`+`team_id`+okres.
   - top_products: TOP 5 produktów po commission z `commission_entries JOIN insurance_policies JOIN deal_team_products`.
   - team_performance: per-rep agregacje (sales count, gwp, commission).
   - commission_breakdown: suma per `recipient_label` (Rep/Handling/SGU/Adam/Paweł/Remek).
   - alerts: rules (np. „spadek GWP >20% MoM", „rep bez aktywności >14 dni").
   - comparison_previous_period: te same KPI dla poprzedniego okna + delta_pct.
   - INSERT z `ON CONFLICT (tenant_id, team_id, period_type, period_start) DO UPDATE SET data=EXCLUDED.data, generated_at=now()`.
   - RETURN id.
4. `rpc_sgu_generate_snapshot(p_type text, p_start date, p_end date DEFAULT NULL)` authenticated wrapper:
   - Auth: `has_sgu_access() OR director`.
   - Resolve tenant + team via `get_current_tenant_id()` + `get_sgu_team_id()`.
   - Default `p_end`: jeśli NULL, kalkuluj z type (weekly = +6d, monthly = end of month, quarterly = end of quarter, yearly = end of year, custom wymaga p_end).
   - Wywołanie `_internal` z `generated_by='manual'`, `generated_by_user_id=auth.uid()`.
5. `rpc_sgu_get_snapshot(p_id uuid)` — SELECT z RLS check.
6. GRANT EXECUTE dla `rpc_sgu_generate_snapshot` i `rpc_sgu_get_snapshot` TO authenticated.

**B. pg_cron (insert tool, NIE migracja — zawiera URL/secrets pattern):** 4 joby per `schedule_edge_function`. Alternatywnie bezpośredni SELECT do RPC bez edge fn (ponieważ snapshot jest pure SQL):
```sql
-- Każdy job iteruje po SGU teamach w tenancie i wywołuje rpc_sgu_generate_snapshot_internal
cron.schedule('sgu_weekly_snapshot', '0 6 * * 1', $$ ... per tenant loop ... $$);
cron.schedule('sgu_monthly_snapshot', '0 6 1 * *', ...);
cron.schedule('sgu_quarterly_snapshot', '10 6 1 1,4,7,10 *', ...);
cron.schedule('sgu_yearly_snapshot', '20 6 1 1 *', ...);
```
Decyzja: zrobić to przez **helper SQL function** `sgu_run_scheduled_snapshots(p_type text)` który iteruje po tenantach z SGU teamem — wtedy cron command krótki: `SELECT public.sgu_run_scheduled_snapshots('weekly');`. Helper kalkuluje period_start/end relatywnie do `CURRENT_DATE - 1 day`.

**C. FE — nowe pliki:**
- `src/types/sgu-report-snapshot.ts` — interfaces (`SGUReportSnapshot`, `SnapshotData`, `KPIBlock`, `TopProduct`, `TeamPerformanceRow`, `CommissionBreakdown`, `Alert`, `ComparisonBlock`).
- `src/hooks/useSGUReports.ts` — `useQuery` lista snapshots filter by `period_type`, sort `period_start DESC`.
- `src/hooks/useGenerateSnapshot.ts` — mutation `rpc_sgu_generate_snapshot` + invalidate + toast.
- `src/hooks/useSnapshotPreview.ts` — `useQuery` single by id (`rpc_sgu_get_snapshot`).
- `src/components/sgu/ReportPreview.tsx` — render `data`:
  - KPI cards (4-6 grid: policies, GWP, commission, tasks, leads, conversion) z deltą vs previous.
  - Tabela top 5 products.
  - Tabela team performance.
  - Recharts `<PieChart>` commission breakdown.
  - Lista alertów (badge severity).
- `src/components/sgu/GenerateSnapshotDialog.tsx` — RHF + Zod (period_type select, period_start date, period_end date conditional dla custom). Submit → mutation.
- `src/components/sgu/ExportPDFButton.tsx` — button → wywołanie `generateSGUReportPDF(snapshot)` → blob → download.
- `src/lib/pdf/sgu-report-pdf.ts` — helper jspdf:
  - Cover page (granatowy bg via rect, biały „Raport SGU", typ okresu, daty).
  - Sekcje: KPI summary, Top products (autotable), Team performance (autotable), Commission breakdown (autotable + opis).
  - Alerty.
  - Footer z page number.
  - Polskie znaki: `addFileToVFS` + `addFont` z `Roboto-Regular.ttf` (base64 inline lub fetch z `/fonts/`).
- `public/fonts/Roboto-Regular.ttf` — pobierz z Google Fonts (~170KB) i zapisz lokalnie.

**D. FE — modyfikacje:**
- `src/pages/sgu/SGUReports.tsx` — pełna przebudowa (zastąpienie placeholder z SGU-01):
  - Header z buttonem „Generuj teraz" → `<GenerateSnapshotDialog>`.
  - `<Tabs>` z 4 zakładkami: Tygodniowe / Miesięczne / Kwartalne / Roczne (+ ewentualnie „Custom" jako 5).
  - Per tab: lista snapshots (tabela: data, generated_by, akcje [Podgląd, Export PDF, Usuń dla director]).
  - Klik wiersz → expand `<ReportPreview snapshotId={...}>` inline lub w drawer.
- `src/components/layout/SGUSidebar.tsx` — `reportItems` (linie 76-79) już ma „Tygodniowy" i „Miesięczny" → zastąp jednym linkiem `{ title: 'Raporty', url: '/sgu/reports', icon: BarChart3 }` ALBO zostaw 2 + dodaj kolejne. Decyzja: zastąp 2 jednym linkiem „Raporty" → SGUReports z tabs (zgodnie z 1 widokiem z tabami). Sprawdzić czy `App.tsx` ma route `/sgu/reports` → jeśli jest tylko `/sgu/reports/weekly` i `/sgu/reports/monthly`, dodać `/sgu/reports`.
- `src/App.tsx` — dodaj `<Route path="/sgu/reports" element={<SGUReports/>}/>` (lub upewnij się że istniejący routing pasuje).

### Pliki

**Nowe (10):**
- `supabase/migrations/<ts>_sgu_08_reports.sql`
- `src/types/sgu-report-snapshot.ts`
- `src/hooks/useSGUReports.ts`
- `src/hooks/useGenerateSnapshot.ts`
- `src/hooks/useSnapshotPreview.ts`
- `src/components/sgu/ReportPreview.tsx`
- `src/components/sgu/GenerateSnapshotDialog.tsx`
- `src/components/sgu/ExportPDFButton.tsx`
- `src/lib/pdf/sgu-report-pdf.ts`
- `public/fonts/Roboto-Regular.ttf`

**Modyfikowane (3):**
- `src/pages/sgu/SGUReports.tsx` (full rebuild z placeholder)
- `src/components/layout/SGUSidebar.tsx` (link „Raporty" zamiast 2 podlinków)
- `src/App.tsx` (route `/sgu/reports`)

### Ryzyka / decyzje

- **Snapshot data builder (~200 linii SQL)**: Główna złożoność sprintu. Per okres agreguje 6 bloków na `deal_team_contacts`/`insurance_policies`/`commission_entries`/`tasks`. Ryzyko: brak kolumn (np. `gwp` - czy istnieje w `insurance_policies`? `expected_annual_premium_gr` w `deal_team_contacts`?). Mitigation: recon z konkretnym `\d insurance_policies` + `\d deal_team_contacts` przed pisaniem RPC.
- **pg_cron — RPC vs edge fn**: Snapshot jest pure SQL, więc nie potrzeba edge fn. Cron uruchamia bezpośrednio `SELECT sgu_run_scheduled_snapshots('weekly')` (helper iteruje po tenantach). Brak self-call HTTP. Mniej zależności (CRON_SECRET, schedule_edge_function nie wymagane).
- **Roboto font (~170KB) w `public/fonts/`**: Bundlowane do build → ~170KB do każdej sesji jednorazowo. Akceptowalne. Alternative: lazy-load tylko przy kliknięciu „Export PDF" (fetch + cache). MVP: bundle (prościej). Dodać do `.gitattributes` jako binary.
- **Custom period**: `rpc_sgu_generate_snapshot` wymaga `p_end NOT NULL` dla type='custom'. Walidacja w RPC + FE form.
- **Top products / team performance — kolumny**: zależne od reconu. Jeśli `insurance_policies.product_id` brak → fallback na `deal_team_products.name`. Sprintową wartość obniża, ale nie blokuje sprintu.
- **PDF QA**: zgodnie z artifact rules — po generacji testowej PDF konwertuję 1-2 strony do PNG i sprawdzam: polskie znaki, brak overlapping, granatowy cover. Jeśli problem z fontem → fallback do helvetica (bez polskich znaków, znaki PL transliterowane).
- **RLS rep block**: rep ma `has_sgu_access()=true` ale NIE jest partnerem ani directorem. Policy SELECT używa `is_sgu_partner() OR get_current_director_id() IS NOT NULL OR is_superadmin()` — rep dostaje pusty wynik (zgodnie ze specem).
- **Alerty (rules)**: w MVP 2-3 reguły hardcoded w RPC: (a) GWP MoM < -20% → severity high; (b) rep bez sales w okresie → severity medium; (c) commission breakdown niezgodne z 100% → severity critical (data integrity). Rozszerzenie = follow-up.
- **`useSGUReports` filter**: jeden hook z parametrem `period_type` zamiast 4 oddzielnych. React Query key: `['sgu-reports', period_type]`.

### Raport końcowy
1. Lista plików (10 nowych + 3 modyfikowane, absolute paths).
2. Status migracji + status pg_cron 4 jobów.
3. Wyniki recon (5 punktów + round 2).
4. Smoke 1: `SELECT rpc_sgu_generate_snapshot_internal(...)` → wpis w `sgu_reports_snapshots` z poprawnym `data jsonb`.
5. Smoke 2: UI Remek loguje `/sgu/reports` → klik „Generuj teraz" monthly → preview KPI/products/team/pie/alerts → Export PDF → plik z polskimi znakami otwiera się.
6. Smoke 3: rep loguje → `/sgu/reports` brak linka w sidebarze (lub access denied), `SELECT count(*) FROM sgu_reports_snapshots = 0`.
7. Smoke 4: custom 14-dniowy snapshot → wpis z `period_type='custom'`, `generated_by='manual'`, `generated_by_user_id=remek.uid`.
8. `npm run build` + `npm run lint` zielone.
9. `cron.job WHERE jobname LIKE 'sgu_%_snapshot'` — 4 wpisy aktywne.

Po Twojej akceptacji: recon (5 calls + round 2 conditional) → migracja SQL → insert pg_cron 4 jobów → FE batch (10 nowych + 3 modyfikowane) → fetch Roboto-Regular.ttf → smoke 4 scenariuszy + PDF QA → raport.
